import OpenAI from "openai";
import type { DatasetMeta } from "@/lib/types";

export type GeneratedSql = { sql: string; explanation: string };

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function schemaText(ds: DatasetMeta): string {
  const cols = ds.columns
    .map((c) => `  - "${c.name}" ${c.type}${c.original !== c.name ? ` (original header: "${c.original}")` : ""}`)
    .join("\n");
  return `Table: "${ds.tableName}"  (${ds.rowCount} rows)\nColumns:\n${cols}`;
}

/**
 * Convert a natural-language question into a single read-only PostgreSQL SELECT.
 * The generated SQL is still independently validated + executed read-only afterwards,
 * so this prompt is a convenience, not the security boundary.
 */
export async function generateSql(question: string, ds: DatasetMeta): Promise<GeneratedSql> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set — add a valid key to .env to convert questions into SQL.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = `You are an expert PostgreSQL analyst. Convert the user's question into ONE valid, read-only PostgreSQL SELECT query over the table described below.

Rules:
- Output ONLY a SELECT (or WITH ... SELECT) query. Never INSERT/UPDATE/DELETE/DROP/ALTER/CREATE, and never multiple statements.
- Use ONLY this table and these columns. Quote identifiers with double quotes exactly as given.
- Always add a sensible LIMIT (<= 1000) unless it is an aggregate that already returns few rows.
- Use ILIKE for case-insensitive text matching. Cast text to numeric/date only when needed.
- If the question cannot be answered from these columns, return your best reasonable SELECT anyway.

Respond strictly as JSON: {"sql": "<the query>", "explanation": "<one short sentence describing what it does>"}.

${schemaText(ds)}`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: question },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  let parsed: { sql?: string; explanation?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The AI did not return valid JSON.");
  }
  if (!parsed.sql || typeof parsed.sql !== "string") {
    throw new Error("The AI did not return an SQL query.");
  }
  return { sql: parsed.sql.trim(), explanation: (parsed.explanation ?? "").trim() };
}
