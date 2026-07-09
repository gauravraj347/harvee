"use client";

import { useRef, useState } from "react";
import { apiPost } from "@/lib/client";
import { renderMarkdown } from "@/lib/markdown";
import { Button, Card, Spinner } from "@/components/ui";

type AssistantResponse = { answer: string; toolsUsed: string[]; mode: "openai" | "fallback" };
type Message = { role: "user" | "assistant"; content: string; mode?: "openai" | "fallback"; toolsUsed?: string[] };

const SUGGESTIONS = [
  "How many students were allocated to each course?",
  "Which students did not receive their first preference?",
  "Which course had the highest rejection rate?",
  "Show the category-wise allocation summary.",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await apiPost<AssistantResponse>("/api/assistant", { question: q });
      setMessages((m) => [...m, { role: "assistant", content: res.answer, mode: res.mode, toolsUsed: res.toolsUsed }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Request failed"}` },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Assistant</h1>
        <p className="text-sm text-slate-500">
          Ask about the allocation. Answers are computed from live database analytics — the assistant never invents
          numbers.
        </p>
      </div>

      {/* Suggested questions */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={loading}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <Card className="flex h-[60vh] flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
              Ask a question or tap a suggestion above to get started.
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-800"
                }`}
              >
                {m.role === "assistant" ? (
                  <>
                    <div
                      className="prose-chat"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                    {m.mode && (
                      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-200 pt-1.5 text-[11px] text-slate-400">
                        <span
                          className={`rounded px-1.5 py-0.5 font-medium ${
                            m.mode === "openai" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {m.mode === "openai" ? "OpenAI" : "built-in analyzer"}
                        </span>
                        {m.toolsUsed && m.toolsUsed.length > 0 && (
                          <span>· used: {Array.from(new Set(m.toolsUsed)).join(", ")}</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                <Spinner /> Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 border-t border-slate-200 p-3"
        >
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about students, courses, seats or the allocation…"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
