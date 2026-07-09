# Task 2 — AI SQL Assistant

Upload any **CSV or Excel** dataset, have its schema auto-detected and a table created dynamically in **PostgreSQL**, then query it in **natural language** — the assistant converts your question into SQL, validates it, runs it read-only, and shows the results.

Single self-contained **Next.js (App Router)** full-stack app: the API route handlers are the Node backend; **`pg`** talks to PostgreSQL; **OpenAI** does prompt-to-SQL. Server-only code is organized under `src/server/` by concern.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # upload · dataset list · schema · chat UI
│   └── api/                  # datasets · datasets/[id] · query
├── server/                   # server-only backend code
│   ├── db/                   # pool · datasets.repository (registry queries)
│   ├── ingestion/            # file-parser · schema-detector · dataset.service
│   ├── ai/nl-to-sql.ts       # prompt → SQL (OpenAI)
│   └── sql/query-guard.ts    # validate + read-only execute
├── lib/                      # types · api-client (shared client-side)
└── components/               # ui · ResultsTable
```

---

## Mandatory features — all implemented

| Feature | Where |
| --- | --- |
| Dataset upload (CSV/Excel) | `POST /api/datasets` → [`file-parser.ts`](src/server/ingestion/file-parser.ts) + [`dataset.service.ts`](src/server/ingestion/dataset.service.ts) (`papaparse` + `xlsx`) |
| Automatic schema detection | [`schema-detector.ts`](src/server/ingestion/schema-detector.ts) (integer/numeric/boolean/date/timestamp/text) |
| Dynamic table creation | `createDataset()` → `CREATE TABLE "ds_<id>"` + batched inserts |
| Store data in PostgreSQL | each dataset = one `ds_<id>` table; registry in `_datasets` |
| AI chat interface | [`src/app/page.tsx`](src/app/page.tsx) |
| Prompt → SQL | [`nl-to-sql.ts`](src/server/ai/nl-to-sql.ts) (OpenAI, JSON-mode) |
| Query validation | [`query-guard.ts`](src/server/sql/query-guard.ts) `validateSelect()` |
| Query execution | `executeReadOnly()` — READ ONLY transaction + statement timeout |
| Result display | results table + generated SQL + explanation |
| Error handling | staged errors (`input`/`dataset`/`generate`/`validate`/`execute`) surfaced in the UI |

Bonus features (query history, charts, insights, export) are intentionally **not** included to keep the scope to what was required.

---

## Safety model (why AI-generated SQL is safe to run)

Two independent layers — the query only runs if **both** pass:

1. **Static validation** (`validateSelect`): must be a *single*, comment-free `SELECT`/`WITH`; must reference only the dataset's own `ds_<id>` table; rejects any write/DDL keyword (`INSERT/UPDATE/DELETE/DROP/…`); auto-appends `LIMIT 1000` if absent.
2. **Read-only execution** (`executeReadOnly`): runs inside `BEGIN; SET TRANSACTION READ ONLY; SET LOCAL statement_timeout=8s;` — so even if a write slipped past layer 1, **PostgreSQL itself rejects it** (verified: a forced `UPDATE` fails with *"cannot execute UPDATE in a read-only transaction"*).

---

## Setup & run

**Prerequisites:** Node 18+, Docker Desktop, and a valid **OpenAI API key** (needed for the natural-language → SQL step).

```bash
# 1. Start PostgreSQL (host port 5434, to avoid clashing with other local DBs)
docker compose up -d

# 2. Install + configure
npm install
#   edit .env and set OPENAI_API_KEY="sk-..."   (DATABASE_URL is preconfigured)

# 3. Run
npm run dev            # http://localhost:3000
```

> **OpenAI key:** upload, schema detection, table creation and SQL execution all work without a key, but *asking questions* needs one. If a key is missing/invalid the `/api/query` endpoint returns a clear `502 { error, stage: "generate" }` (also note: an `OPENAI_API_KEY` exported in your shell overrides `.env`).

### Try it
1. Open http://localhost:3000.
2. Upload [`sample-data/sales.csv`](sample-data/sales.csv) (23 rows with intentional duplicates + missing values).
3. Ask questions — tap an example chip or type your own.

---

## Example queries (work against the sample dataset)

- *Show top 10 customers by revenue.*
- *Find duplicate records.*
- *Which month generated the highest sales?*
- *Show records with missing values.*
- *Generate a sales summary for the last quarter.*

---

## API reference (base `http://localhost:3000`)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/datasets` | List uploaded datasets |
| `POST` | `/api/datasets` | Upload a CSV/Excel file (multipart, field `file`) → detect schema, create table, insert |
| `GET` | `/api/datasets/:id` | Dataset schema + sample rows |
| `DELETE` | `/api/datasets/:id` | Drop the table and registry row |
| `POST` | `/api/query` | `{ datasetId, question }` → `{ sql, explanation, columns, rows, rowCount }` |

---

## Schema detection

A column is given a specific type only when **every** non-empty value matches it (so inserts never fail on a cast); otherwise it falls back to `TEXT`. Empty cells become `NULL`. Long numeric strings (16+ digits, e.g. IDs) stay `TEXT` to avoid precision loss. Headers are sanitized to safe snake_case identifiers (originals kept for display and for the AI prompt).

---

## Notes & assumptions

- One PostgreSQL table per dataset (`ds_<id>`); a small `_datasets` registry stores name, table, columns and row count.
- Results are capped at 1000 rows and queries at an 8-second statement timeout.
- "Duplicate records" / "missing values" style questions rely on the AI writing appropriate SQL (e.g. `GROUP BY ... HAVING COUNT(*) > 1`, `WHERE col IS NULL`).
