import type { ReactNode } from "react";

function formatCell(v: unknown): ReactNode {
  if (v === null || v === undefined) return <span className="text-slate-300">NULL</span>;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function ResultsTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  if (columns.length === 0) return null;
  return (
    <div className="max-h-[380px] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c} className="max-w-[280px] truncate whitespace-nowrap px-3 py-1.5" title={r[c] == null ? "" : String(r[c])}>
                  {formatCell(r[c])}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">
                No rows returned.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
