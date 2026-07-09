"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiDelete, apiGet, apiPostJson, apiUpload } from "@/lib/api-client";
import type { ColumnMeta, DatasetMeta, QueryResult } from "@/lib/types";
import { Button, Card, ErrorNote, Spinner, TypeBadge } from "@/components/ui";
import { ResultsTable } from "@/components/ResultsTable";

type DatasetDetail = { dataset: DatasetMeta; sample: QueryResult };

type QueryResponse = {
  sql: string;
  explanation?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
};

type ChatMsg = {
  question: string;
  loading?: boolean;
  sql?: string;
  explanation?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  error?: string;
  stage?: string;
};

const EXAMPLES = [
  "Show top 10 customers by revenue.",
  "Find duplicate records.",
  "Which month generated the highest sales?",
  "Show records with missing values.",
  "Generate a sales summary for the last quarter.",
];

export default function Home() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selected, setSelected] = useState<DatasetDetail | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState("");
  const [querying, setQuerying] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDatasets = useCallback(async () => {
    setDatasets(await apiGet<DatasetMeta[]>("/api/datasets"));
  }, []);

  useEffect(() => {
    loadDatasets().catch(() => {});
  }, [loadDatasets]);

  async function selectDataset(id: number) {
    setMessages([]);
    setShowSample(false);
    const detail = await apiGet<DatasetDetail>(`/api/datasets/${id}`);
    setSelected(detail);
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadError("Choose a .csv, .xlsx or .xls file first.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (name.trim()) fd.append("name", name.trim());
      const ds = await apiUpload<DatasetMeta>("/api/datasets", fd);
      setFile(null);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      await loadDatasets();
      await selectDataset(ds.id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeDataset(id: number, dsName: string) {
    if (!confirm(`Delete dataset "${dsName}" and drop its table?`)) return;
    await apiDelete(`/api/datasets/${id}`);
    if (selected?.dataset.id === id) setSelected(null);
    await loadDatasets();
  }

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || !selected || querying) return;
    setQuestion("");
    setQuerying(true);
    const idx = messages.length;
    setMessages((m) => [...m, { question: trimmed, loading: true }]);
    try {
      const res = await apiPostJson<QueryResponse>("/api/query", {
        datasetId: selected.dataset.id,
        question: trimmed,
      });
      setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, loading: false, ...res } : msg)));
    } catch (err) {
      const payload = (err as { payload?: { stage?: string; sql?: string; explanation?: string } }).payload ?? {};
      setMessages((m) =>
        m.map((msg, i) =>
          i === idx
            ? {
                ...msg,
                loading: false,
                error: err instanceof Error ? err.message : "Query failed",
                stage: payload.stage,
                sql: payload.sql,
                explanation: payload.explanation,
              }
            : msg
        )
      );
    } finally {
      setQuerying(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
          Σ
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI SQL Assistant</h1>
          <p className="text-sm text-slate-500">Upload a CSV/Excel dataset and query it in plain English.</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Left: upload + datasets */}
        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Upload dataset</h2>
            <form onSubmit={upload} className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
              />
              <input
                className="input"
                placeholder="Dataset name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {uploadError && <ErrorNote>{uploadError}</ErrorNote>}
              <Button type="submit" disabled={uploading} className="w-full">
                {uploading ? <Spinner /> : null}
                {uploading ? "Uploading…" : "Upload & detect schema"}
              </Button>
            </form>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Datasets <span className="text-slate-400">({datasets.length})</span>
            </h2>
            {datasets.length === 0 ? (
              <p className="text-sm text-slate-400">No datasets yet. Upload one above.</p>
            ) : (
              <ul className="space-y-1">
                {datasets.map((d) => {
                  const active = selected?.dataset.id === d.id;
                  return (
                    <li key={d.id}>
                      <div
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm ${
                          active ? "bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <button className="min-w-0 flex-1 text-left" onClick={() => selectDataset(d.id)}>
                          <div className={`truncate font-medium ${active ? "text-brand-700" : "text-slate-800"}`}>
                            {d.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {d.rowCount} rows · {d.columns.length} cols
                          </div>
                        </button>
                        <button
                          onClick={() => removeDataset(d.id, d.name)}
                          className="ml-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete dataset"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>

        {/* Right: schema + chat */}
        <main className="space-y-4">
          {!selected ? (
            <Card className="flex h-64 items-center justify-center text-sm text-slate-400">
              Select a dataset on the left, or upload one, to start asking questions.
            </Card>
          ) : (
            <>
              <SchemaCard
                dataset={selected.dataset}
                sample={selected.sample}
                showSample={showSample}
                onToggleSample={() => setShowSample((s) => !s)}
              />

              {/* Chat */}
              <Card className="p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} className="chip" disabled={querying} onClick={() => ask(ex)}>
                      {ex}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {messages.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-400">
                      Ask a question about <span className="font-medium">{selected.dataset.name}</span> — or tap an
                      example above.
                    </p>
                  )}
                  {messages.map((m, i) => (
                    <ChatItem key={i} msg={m} />
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(question);
                  }}
                  className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3"
                >
                  <input
                    className="input"
                    placeholder="e.g. Show the top 5 products by total quantity"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={querying}
                  />
                  <Button type="submit" disabled={querying || !question.trim()}>
                    {querying ? <Spinner /> : "Ask"}
                  </Button>
                </form>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SchemaCard({
  dataset,
  sample,
  showSample,
  onToggleSample,
}: {
  dataset: DatasetMeta;
  sample: QueryResult;
  showSample: boolean;
  onToggleSample: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">{dataset.name}</h2>
          <p className="text-xs text-slate-400">
            table <code className="rounded bg-slate-100 px-1">{dataset.tableName}</code> · {dataset.rowCount} rows ·{" "}
            {dataset.columns.length} columns
          </p>
        </div>
        <Button variant="secondary" onClick={onToggleSample}>
          {showSample ? "Hide sample" : "Preview data"}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {dataset.columns.map((c: ColumnMeta) => (
          <span key={c.name} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">
            <span className="font-medium text-slate-700">{c.name}</span>
            <TypeBadge type={c.type} />
          </span>
        ))}
      </div>

      {showSample && (
        <div className="mt-3">
          <ResultsTable columns={sample.columns} rows={sample.rows} />
        </div>
      )}
    </Card>
  );
}

function ChatItem({ msg }: { msg: ChatMsg }) {
  return (
    <div className="space-y-2">
      {/* question */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-brand-600 px-4 py-2 text-sm text-white">{msg.question}</div>
      </div>

      {/* answer */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {msg.loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner /> Generating SQL and running it…
          </div>
        ) : (
          <div className="space-y-2">
            {msg.explanation && <p className="text-sm text-slate-600">{msg.explanation}</p>}
            {msg.sql && <SqlBlock sql={msg.sql} />}
            {msg.error ? (
              <ErrorNote>
                <span className="font-medium">
                  {msg.stage ? `[${msg.stage}] ` : ""}
                </span>
                {msg.error}
              </ErrorNote>
            ) : msg.columns ? (
              <>
                <ResultsTable columns={msg.columns} rows={msg.rows ?? []} />
                <p className="text-xs text-slate-400">{msg.rowCount} row(s)</p>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function SqlBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">
        <code>{sql}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(sql);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute right-2 top-2 rounded bg-slate-700 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-600"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
