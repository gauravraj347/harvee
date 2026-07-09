import { NextResponse } from "next/server";
import { parseFile } from "@/server/ingestion/file-parser";
import { createDataset } from "@/server/ingestion/dataset.service";
import { listDatasets } from "@/server/db/datasets.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// GET /api/datasets — list uploaded datasets.
export async function GET() {
  try {
    return NextResponse.json(await listDatasets());
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

// POST /api/datasets — upload a CSV/Excel file (multipart form-data, field "file").
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded (expected form field 'file')." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 15 MB)." }, { status: 400 });
    }

    const name = (form.get("name")?.toString().trim() || file.name).slice(0, 120);
    const buf = Buffer.from(await file.arrayBuffer());

    const parsed = await parseFile(file.name, buf);
    const dataset = await createDataset(name, parsed);
    return NextResponse.json(dataset, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error";
}
