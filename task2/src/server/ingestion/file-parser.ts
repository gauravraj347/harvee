import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedFile = { headers: string[]; rows: string[][] };

export function parseCsv(text: string): ParsedFile {
  const res = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  const data = (res.data as string[][]) ?? [];
  if (data.length === 0) throw new Error("The CSV file appears to be empty.");
  const [headers, ...rows] = data;
  return { headers: headers.map((h) => String(h ?? "")), rows };
}

export function parseExcel(buf: Buffer): ParsedFile {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("The Excel file has no sheets.");
  const sheet = wb.Sheets[sheetName];
  const arr = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  if (arr.length === 0) throw new Error("The Excel sheet appears to be empty.");
  const [headers, ...rows] = arr;
  return {
    headers: (headers as unknown[]).map((h) => String(h ?? "")),
    rows: (rows as unknown[][]).map((r) => r.map((c) => (c == null ? "" : String(c)))),
  };
}

/** Detect the file type from its name and parse into a uniform {headers, rows} shape. */
export async function parseFile(filename: string, buf: Buffer): Promise<ParsedFile> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsv(buf.toString("utf-8"));
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseExcel(buf);
  throw new Error("Unsupported file type. Please upload a .csv, .xlsx or .xls file.");
}
