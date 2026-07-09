import type { ColumnType } from "@/lib/types";

/**
 * Turn an arbitrary CSV/Excel header into a safe lowercase snake_case SQL identifier.
 * All identifiers are additionally double-quoted at query time, but sanitizing keeps
 * them readable and avoids surprises.
 */
export function sanitizeColumnName(raw: string, index: number): string {
  let name = (raw ?? "").toString().trim().toLowerCase();
  name = name.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!name) name = `col_${index + 1}`;
  if (/^[0-9]/.test(name)) name = `c_${name}`;
  return name.slice(0, 63); // PostgreSQL identifier length limit
}

/** Ensure column names are unique by suffixing duplicates. */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const count = seen.get(n) ?? 0;
    seen.set(n, count + 1);
    return count === 0 ? n : `${n}_${count + 1}`;
  });
}

const isEmpty = (v: string) => v === null || v === undefined || v.trim() === "";

const INT_RE = /^-?\d+$/;
const DEC_RE = /^-?(\d+\.\d*|\.\d+|\d+)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TS_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/;
const BOOL_VALUES = new Set(["true", "false", "yes", "no", "t", "f"]);

/**
 * Infer a column's type from its values. A type is only assigned if EVERY non-empty
 * value matches it, so that the subsequent bulk insert can never fail on a cast.
 */
export function inferColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => !isEmpty(v)).map((v) => v.trim());
  if (nonEmpty.length === 0) return "text";

  const every = (pred: (v: string) => boolean) => nonEmpty.every(pred);

  if (every((v) => BOOL_VALUES.has(v.toLowerCase()))) return "boolean";

  if (every((v) => INT_RE.test(v))) {
    // Keep long numeric strings (e.g. 16+ digit IDs) as text to avoid precision loss.
    const fitsBigint = nonEmpty.every((v) => v.replace("-", "").length <= 18);
    return fitsBigint ? "integer" : "text";
  }

  if (every((v) => DEC_RE.test(v))) return "numeric";
  if (every((v) => TS_RE.test(v))) return "timestamp";
  if (every((v) => DATE_RE.test(v))) return "date";

  return "text";
}

/** Map an inferred type to its PostgreSQL column type. */
export function sqlType(type: ColumnType): string {
  switch (type) {
    case "integer":
      return "BIGINT";
    case "numeric":
      return "DOUBLE PRECISION";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "DATE";
    case "timestamp":
      return "TIMESTAMP";
    default:
      return "TEXT";
  }
}

/** Coerce a raw string cell into the JS value to bind for its column type. */
export function coerceValue(raw: unknown, type: ColumnType): unknown {
  if (raw === null || raw === undefined) return null;
  const v = String(raw).trim();
  if (v === "") return null;
  switch (type) {
    case "integer": {
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    }
    case "numeric": {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    case "boolean": {
      const l = v.toLowerCase();
      if (l === "true" || l === "yes" || l === "t") return true;
      if (l === "false" || l === "no" || l === "f") return false;
      return null;
    }
    default:
      return v; // date/timestamp/text — PostgreSQL casts the string on insert
  }
}
