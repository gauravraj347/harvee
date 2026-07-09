import { Pool } from "pg";

// Reuse a single pool across hot-reloads in dev.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

let metadataReady = false;

/**
 * Ensure the `_datasets` registry table exists. One row per uploaded dataset;
 * the actual data lives in a dynamically-created `ds_<id>` table.
 */
export async function ensureMetadata(): Promise<void> {
  if (metadataReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _datasets (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      table_name TEXT NOT NULL UNIQUE,
      columns    JSONB NOT NULL DEFAULT '[]'::jsonb,
      row_count  INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  metadataReady = true;
}
