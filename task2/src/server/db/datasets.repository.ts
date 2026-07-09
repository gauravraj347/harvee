import { pool, ensureMetadata } from "@/server/db/pool";
import type { ColumnMeta, DatasetMeta, QueryResult } from "@/lib/types";

type DatasetRow = {
  id: number;
  name: string;
  table_name: string;
  columns: ColumnMeta[];
  row_count: number;
  created_at: Date | string;
};

function rowToMeta(r: DatasetRow): DatasetMeta {
  return {
    id: r.id,
    name: r.name,
    tableName: r.table_name,
    columns: r.columns,
    rowCount: r.row_count,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

export async function listDatasets(): Promise<DatasetMeta[]> {
  await ensureMetadata();
  const r = await pool.query<DatasetRow>(
    "SELECT id, name, table_name, columns, row_count, created_at FROM _datasets ORDER BY created_at DESC"
  );
  return r.rows.map(rowToMeta);
}

export async function getDataset(id: number): Promise<DatasetMeta | null> {
  await ensureMetadata();
  const r = await pool.query<DatasetRow>(
    "SELECT id, name, table_name, columns, row_count, created_at FROM _datasets WHERE id = $1",
    [id]
  );
  return r.rows[0] ? rowToMeta(r.rows[0]) : null;
}

export async function getSampleRows(tableName: string, limit = 10): Promise<QueryResult> {
  // tableName comes from our own registry (ds_<int>), never user input.
  const r = await pool.query(`SELECT * FROM "${tableName}" LIMIT ${limit}`);
  return { columns: r.fields.map((f) => f.name), rows: r.rows, rowCount: r.rowCount ?? r.rows.length };
}

export async function deleteDataset(id: number): Promise<boolean> {
  const ds = await getDataset(id);
  if (!ds) return false;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DROP TABLE IF EXISTS "${ds.tableName}"`);
    await client.query("DELETE FROM _datasets WHERE id = $1", [id]);
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
