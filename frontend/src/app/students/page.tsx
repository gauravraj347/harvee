"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/client";
import type { Category, CourseWithQuotas, StudentRow } from "@/lib/types";
import { Button, Card, CategoryBadge, Empty, ErrorNote, SectionTitle, Spinner } from "@/components/ui";

const CATEGORIES: Category[] = ["GENERAL", "OBC", "SC", "ST"];

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseWithQuotas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [marks, setMarks] = useState("");
  const [category, setCategory] = useState<Category>("GENERAL");
  const [appDate, setAppDate] = useState("");
  const [prefs, setPrefs] = useState<string[]>(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, c] = await Promise.all([
        apiGet<StudentRow[]>("/api/students"),
        apiGet<CourseWithQuotas[]>("/api/courses"),
      ]);
      setStudents(s);
      setCourses(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPrefIds = useMemo(
    () => prefs.filter(Boolean).map(Number),
    [prefs]
  );

  function setPref(index: number, value: string) {
    setPrefs((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const preferences = prefs.filter(Boolean).map(Number);
    if (preferences.length === 0) {
      setFormError("Select at least a first preference.");
      return;
    }
    if (new Set(preferences).size !== preferences.length) {
      setFormError("Preferences must be different courses.");
      return;
    }
    const marksNum = Number(marks);
    if (Number.isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      setFormError("Marks must be between 0 and 100.");
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/students", {
        name: name.trim(),
        marks: marksNum,
        category,
        applicationDate: appDate ? new Date(appDate).toISOString() : undefined,
        preferences,
      });
      // reset
      setName("");
      setMarks("");
      setCategory("GENERAL");
      setAppDate("");
      setPrefs(["", "", ""]);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="text-sm text-slate-500">Register applicants and review their ranked course preferences.</p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Registration form */}
      <Card className="p-5">
        <SectionTitle>Register Student</SectionTitle>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </Field>
          <Field label="Marks (0–100)">
            <input
              className="input"
              type="number"
              step="0.01"
              min={0}
              max={100}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              placeholder="e.g. 87.5"
              required
            />
          </Field>
          <Field label="Category">
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Application Date (optional)">
            <input className="input" type="datetime-local" value={appDate} onChange={(e) => setAppDate(e.target.value)} />
          </Field>

          <div className="md:col-span-2">
            <div className="mb-1 text-sm font-medium text-slate-700">Preferred Courses (priority order)</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <select
                  key={i}
                  className="input"
                  value={prefs[i]}
                  onChange={(e) => setPref(i, e.target.value)}
                >
                  <option value="">{`Priority ${i + 1}${i === 0 ? " (required)" : " (optional)"}`}</option>
                  {courses.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={selectedPrefIds.includes(c.id) && prefs[i] !== String(c.id)}
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          {formError && (
            <div className="md:col-span-2">
              <ErrorNote>{formError}</ErrorNote>
            </div>
          )}

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting || courses.length === 0}>
              {submitting ? <Spinner /> : null}
              {submitting ? "Registering…" : "Register Student"}
            </Button>
            {courses.length === 0 && (
              <span className="ml-3 text-sm text-amber-600">Add a course first on the Courses page.</span>
            )}
          </div>
        </form>
      </Card>

      {/* Student list */}
      <section>
        <SectionTitle>
          All Students <span className="text-sm font-normal text-slate-400">({students.length})</span>
        </SectionTitle>
        <Card className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-slate-500">
              <Spinner /> Loading…
            </div>
          ) : students.length === 0 ? (
            <Empty>No students registered yet.</Empty>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Marks</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Preferences</th>
                  <th className="px-4 py-3">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-2.5 text-right">{s.marks}</td>
                    <td className="px-4 py-2.5">
                      <CategoryBadge category={s.category} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {new Date(s.applicationDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {s.preferences.map((p) => (
                          <span
                            key={p.priority}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                          >
                            <span className="text-slate-400">{p.priority}.</span>
                            {p.course.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {s.allocation ? (
                        <span className="text-slate-700">
                          {s.allocation.course.name}{" "}
                          <span className="text-xs text-slate-400">(#{s.allocation.preferencePriority})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
