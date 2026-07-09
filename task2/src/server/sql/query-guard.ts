import { pool } from "@/server/db/pool";
import type { QueryResult } from "@/lib/types";

/**
 * Defense-in-depth for executing AI-generated SQL:
 *   1. Static validation — must be a single, comment-free SELECT/WITH that references
 *      only the dataset's own table and uses no write/DDL keywords.
 *   2. Execution inside a READ ONLY transaction with a statement timeout — even if a
 *      malicious query slipped past (1), PostgreSQL itself rejects any write.
 */

const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|merge|call|do|vacuum|analyze|reindex|comment|lock|set|reset|begin|commit|rollback|savepoint|prepare|execute|listen|notify|refresh|cluster|into)\b/i;

const MAX_ROWS = 1000;

export type ValidationResult = { ok: true; sql: string } | { ok: false; reason: string };

export function validateSelect(rawSql: string, allowedTable: string): ValidationResult {
  let sql = (rawSql ?? "").trim().replace(/;+\s*$/, "").trim();

  if (!sql) return { ok: false, reason: "Empty query." };
  if (sql.includes("--") || sql.includes("/*")) {
    return { ok: false, reason: "SQL comments are not allowed." };
  }
  if (sql.includes(";")) {
    return { ok: false, reason: "Only a single statement is allowed." };
  }
  if (!/^(select|with)\b/i.test(sql)) {
    return { ok: false, reason: "Only SELECT queries are allowed." };
  }
  const forbidden = sql.match(FORBIDDEN);
  if (forbidden) {
    return { ok: false, reason: `Disallowed keyword: ${forbidden[0].toUpperCase()}.` };
  }
  const quoted = sql.includes(`"${allowedTable}"`);
  const bare = new RegExp(`\\b${allowedTable}\\b`).test(sql);
  if (!quoted && !bare) {
    return { ok: false, reason: `Query must read from the dataset table "${allowedTable}".` };
  }

  // Enforce a row cap if the model didn't add one.
  if (!/\blimit\b/i.test(sql)) sql = `${sql} LIMIT ${MAX_ROWS}`;

  return { ok: true, sql };
}

export async function executeReadOnly(sql: string): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET TRANSACTION READ ONLY");
    await client.query("SET LOCAL statement_timeout = 8000"); // 8s cap
    const res = await client.query(sql);
    await client.query("ROLLBACK"); // read-only; nothing to commit
    return {
      columns: res.fields.map((f) => f.name),
      rows: res.rows,
      rowCount: res.rowCount ?? res.rows.length,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
