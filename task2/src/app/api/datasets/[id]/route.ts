import { NextResponse } from "next/server";
import { deleteDataset, getDataset, getSampleRows } from "@/server/db/datasets.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/datasets/:id — dataset schema + a sample of rows.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (id === null) return NextResponse.json({ error: "Invalid dataset id" }, { status: 400 });

    const dataset = await getDataset(id);
    if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

    const sample = await getSampleRows(dataset.tableName, 10);
    return NextResponse.json({ dataset, sample });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

// DELETE /api/datasets/:id — drop the dynamic table and its registry row.
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (id === null) return NextResponse.json({ error: "Invalid dataset id" }, { status: 400 });

    const ok = await deleteDataset(id);
    if (!ok) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    return NextResponse.json({ deleted: id });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error";
}
