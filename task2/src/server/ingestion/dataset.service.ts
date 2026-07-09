import type { PoolClient } from "pg";
import { pool, ensureMetadata } from "@/server/db/pool";
import {
  coerceValue,
  dedupeNames,
  inferColumnType,
  sanitizeColumnName,
  sqlType,
} from "@/server/ingestion/schema-detector";
import type { ParsedFile } from "@/server/ingestion/file-parser";
import type { ColumnMeta, DatasetMeta } from "@/lib/types";

function buildColumns(parsed: ParsedFile): ColumnMeta[] {
  const { headers, rows } = parsed;
  if (headers.length === 0) throw new Error("No columns detected in the file.");
  const names = dedupeNames(headers.map((h, i) => sanitizeColumnName(h, i)));
  return names.map((name, i) => ({
    original: headers[i] || name,
    name,
    type: inferColumnType(rows.map((r) => r[i] ?? "")),
  }));
}

async function bulkInsert(
  client: PoolClient,
  tableName: string,
  columns: ColumnMeta[],
  rows: string[][]
): Promise<void> {
  if (rows.length === 0) return;
  const colList = columns.map((c) => `"${c.name}"`).join(", ");
  const BATCH = 500;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const values: unknown[] = [];
    const tuples: string[] = [];
    for (const row of batch) {
      const placeholders = columns.map((c, ci) => {
        values.push(coerceValue(row[ci], c.type));
        return `$${values.length}`;
      });
      tuples.push(`(${placeholders.join(", ")})`);
    }
    await client.query(`INSERT INTO "${tableName}" (${colList}) VALUES ${tuples.join(", ")}`, values);
  }
}

/**
 * Detect schema, create the `ds_<id>` table dynamically, and bulk-insert the rows.
 * Everything happens in a single transaction so a failure leaves no partial table.
 */
export async function createDataset(name: string, parsed: ParsedFile): Promise<DatasetMeta> {
  await ensureMetadata();
  const columns = buildColumns(parsed);
  const rowCount = parsed.rows.length;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ins = await client.query(
      "INSERT INTO _datasets (name, table_name) VALUES ($1, $2) RETURNING id, created_at",
      [name, `pending_${Date.now()}`]
    );
    const id = ins.rows[0].id as number;
    const createdAt = ins.rows[0].created_at as Date;
    const tableName = `ds_${id}`;

    await client.query(
      "UPDATE _datasets SET table_name = $1, columns = $2, row_count = $3 WHERE id = $4",
      [tableName, JSON.stringify(columns), rowCount, id]
    );

    const colDefs = columns.map((c) => `"${c.name}" ${sqlType(c.type)}`).join(", ");
    await client.query(`CREATE TABLE "${tableName}" (${colDefs})`);

    await bulkInsert(client, tableName, columns, parsed.rows);

    await client.query("COMMIT");
    return { id, name, tableName, columns, rowCount, createdAt: createdAt.toISOString() };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
