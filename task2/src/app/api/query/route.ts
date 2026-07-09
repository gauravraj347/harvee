import { NextResponse } from "next/server";
import { z } from "zod";
import { getDataset } from "@/server/db/datasets.repository";
import { generateSql } from "@/server/ai/nl-to-sql";
import { executeReadOnly, validateSelect } from "@/server/sql/query-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  datasetId: z.number().int().positive(),
  question: z.string().trim().min(1, "Question is required").max(1000),
});

// POST /api/query — prompt -> SQL -> validate -> execute -> results.
export async function POST(req: Request) {
  let stage: "input" | "dataset" | "generate" | "validate" | "execute" = "input";
  let generatedSql: string | undefined;
  let explanation: string | undefined;

  try {
    const body = bodySchema.parse(await req.json());

    stage = "dataset";
    const dataset = await getDataset(body.datasetId);
    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found.", stage }, { status: 404 });
    }

    stage = "generate";
    const gen = await generateSql(body.question, dataset);
    generatedSql = gen.sql;
    explanation = gen.explanation;

    stage = "validate";
    const validation = validateSelect(gen.sql, dataset.tableName);
    if (!validation.ok) {
      return NextResponse.json(
        { error: `Rejected generated SQL: ${validation.reason}`, stage, sql: gen.sql, explanation },
        { status: 400 }
      );
    }

    stage = "execute";
    const result = await executeReadOnly(validation.sql);

    return NextResponse.json({
      sql: validation.sql,
      explanation,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", stage: "input", details: err.flatten() },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Unexpected error";
    // AI failures -> 502; SQL execution failures -> 400 (and echo the SQL); else 500.
    const status = stage === "generate" ? 502 : stage === "execute" ? 400 : 500;
    return NextResponse.json({ error: msg, stage, sql: generatedSql, explanation }, { status });
  }
}
