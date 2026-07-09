"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/client";
import type { Category, CourseWithQuotas } from "@/lib/types";
import { Button, Card, Empty, ErrorNote, SectionTitle, Spinner } from "@/components/ui";

const RESERVED: Category[] = ["OBC", "SC", "ST"];

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithQuotas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [quotas, setQuotas] = useState<Record<Category, string>>({ GENERAL: "0", OBC: "0", SC: "0", ST: "0" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCourses(await apiGet<CourseWithQuotas[]>("/api/courses"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const total = Number(totalSeats);
    if (!Number.isInteger(total) || total <= 0) {
      setFormError("Total seats must be a positive whole number.");
      return;
    }
    const quotaList = RESERVED.map((c) => ({ category: c, reservedSeats: Number(quotas[c]) || 0 })).filter(
      (q) => q.reservedSeats > 0
    );
    const reservedSum = quotaList.reduce((s, q) => s + q.reservedSeats, 0);
    if (reservedSum > total) {
      setFormError(`Reserved seats (${reservedSum}) cannot exceed total seats (${total}).`);
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/courses", { name: name.trim(), totalSeats: total, quotas: quotaList });
      setName("");
      setTotalSeats("");
      setQuotas({ GENERAL: "0", OBC: "0", SC: "0", ST: "0" });
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number, courseName: string) {
    if (!confirm(`Delete "${courseName}"? This also removes its preferences and allocations.`)) return;
    try {
      await apiDelete(`/api/courses/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete course");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
        <p className="text-sm text-slate-500">Manage courses, total seats, and category-wise reserved seats.</p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Create course */}
      <Card className="p-5">
        <SectionTitle>Add Course</SectionTitle>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Course Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Computer Science" required />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Total Seats</span>
              <input
                className="input"
                type="number"
                min={1}
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                placeholder="e.g. 6"
                required
              />
            </label>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">
              Reserved Seats by Category <span className="text-slate-400">(remaining become open/merit seats)</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {RESERVED.map((c) => (
                <label key={c} className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">{c}</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={quotas[c]}
                    onChange={(e) => setQuotas((prev) => ({ ...prev, [c]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </div>

          {formError && <ErrorNote>{formError}</ErrorNote>}

          <Button type="submit" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            {submitting ? "Saving…" : "Add Course"}
          </Button>
        </form>
      </Card>

      {/* Course list */}
      <section>
        <SectionTitle>
          All Courses <span className="text-sm font-normal text-slate-400">({courses.length})</span>
        </SectionTitle>
        <Card className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-slate-500">
              <Spinner /> Loading…
            </div>
          ) : courses.length === 0 ? (
            <Empty>No courses yet. Add one above.</Empty>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Open</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3 text-right">Applicants</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => {
                  const reservedSum = c.quotas.reduce((s, q) => s + q.reservedSeats, 0);
                  const open = Math.max(0, c.totalSeats - reservedSum);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{c.name}</td>
                      <td className="px-4 py-2.5 text-right">{c.totalSeats}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{open}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {c.quotas.length === 0 ? (
                            <span className="text-xs text-slate-400">none</span>
                          ) : (
                            c.quotas
                              .slice()
                              .sort((a, b) => a.category.localeCompare(b.category))
                              .map((q) => (
                                <span key={q.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                                  {q.category}: {q.reservedSeats}
                                </span>
                              ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{c._count?.preferences ?? 0}</td>
                      <td className="px-4 py-2.5 text-right">{c._count?.allocations ?? 0}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="danger" onClick={() => remove(c.id, c.name)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
