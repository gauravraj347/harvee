"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client";
import type { AllocationRow, AllocationRunSummary, FullReport } from "@/lib/types";
import { Button, Card, CategoryBadge, Empty, ErrorNote, SeatBadge, SectionTitle, StatCard, Spinner } from "@/components/ui";

export default function DashboardPage() {
  const [report, setReport] = useState<FullReport | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, a] = await Promise.all([
        apiGet<FullReport>("/api/stats"),
        apiGet<AllocationRow[]>("/api/allocations"),
      ]);
      setReport(r);
      setAllocations(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runAllocation() {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const summary = await apiPost<AllocationRunSummary>("/api/allocations/run");
      setNotice(
        `Allocation complete — ${summary.allocated}/${summary.totalStudents} students allocated, ${summary.gotFirstPreference} got their 1st preference.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Allocation failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-slate-500">
        <Spinner /> Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocation Dashboard</h1>
          <p className="text-sm text-slate-500">Merit + reservation based course allocation overview.</p>
        </div>
        <Button onClick={runAllocation} disabled={running}>
          {running ? <Spinner /> : null}
          {running ? "Running…" : "Run Allocation"}
        </Button>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {report && (
        <>
          {/* Overview */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Students" value={report.overview.totalStudents} />
            <StatCard label="Courses" value={report.overview.totalCourses} />
            <StatCard label="Total Seats" value={report.overview.totalSeats} />
            <StatCard
              label="Allocated"
              value={report.overview.totalAllocated}
              sub={`${report.overview.unallocated} unallocated`}
            />
            <StatCard label="Available Seats" value={report.overview.availableSeats} />
            <StatCard label="Got 1st Pref" value={report.overview.gotFirstPreference} />
          </section>

          {/* Course statistics + seat availability */}
          <section>
            <SectionTitle>Course Statistics &amp; Seat Availability</SectionTitle>
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Open</th>
                    <th className="px-4 py-3 text-right">Reserved</th>
                    <th className="px-4 py-3 text-right">Allocated</th>
                    <th className="px-4 py-3 text-right">Available</th>
                    <th className="px-4 py-3 text-right">Applicants</th>
                    <th className="px-4 py-3 text-right">Rejection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.courseStats.map((c) => (
                    <tr key={c.courseId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{c.courseName}</td>
                      <td className="px-4 py-2.5 text-right">{c.totalSeats}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{c.openSeats}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{c.reservedSeats}</td>
                      <td className="px-4 py-2.5 text-right">
                        {c.allocated}
                        <span className="ml-1 text-xs text-slate-400">
                          ({c.allocatedOpen}O/{c.allocatedReserved}R)
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-emerald-700">{c.availableSeats}</td>
                      <td className="px-4 py-2.5 text-right">{c.applicants}</td>
                      <td className="px-4 py-2.5 text-right">
                        <RejectionPill rate={c.rejectionRate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>

          {/* Category + rejection side by side */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <SectionTitle>Category-wise Allocation</SectionTitle>
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Students</th>
                      <th className="px-4 py-3 text-right">Allocated</th>
                      <th className="px-4 py-3 text-right">Unalloc.</th>
                      <th className="px-4 py-3 text-right">Open</th>
                      <th className="px-4 py-3 text-right">Reserved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.byCategory.map((c) => (
                      <tr key={c.category} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <CategoryBadge category={c.category} />
                        </td>
                        <td className="px-4 py-2.5 text-right">{c.totalStudents}</td>
                        <td className="px-4 py-2.5 text-right">{c.allocated}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{c.unallocated}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{c.viaOpenSeat}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{c.viaReservedSeat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            <div>
              <SectionTitle>Rejection Rate by Course</SectionTitle>
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3 text-right">Applicants</th>
                      <th className="px-4 py-3 text-right">Rejected</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rejection.ranking.map((r, i) => (
                      <tr key={r.courseName} className={i === 0 ? "bg-red-50/60" : "hover:bg-slate-50"}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {r.courseName}
                          {i === 0 && <span className="ml-2 text-xs font-normal text-red-600">highest</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">{r.applicants}</td>
                        <td className="px-4 py-2.5 text-right">{r.rejected}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{r.rejectionRatePercent}%</td>
                      </tr>
                    ))}
                    {report.rejection.ranking.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <Empty>No applications yet.</Empty>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          </section>

          {/* Allocated students */}
          <section>
            <SectionTitle>
              Allocated Students <span className="text-sm font-normal text-slate-400">({allocations.length})</span>
            </SectionTitle>
            <Card className="overflow-x-auto">
              {allocations.length === 0 ? (
                <Empty>No allocations yet. Click &ldquo;Run Allocation&rdquo; to compute results.</Empty>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Marks</th>
                      <th className="px-4 py-3">Allocated Course</th>
                      <th className="px-4 py-3">Seat</th>
                      <th className="px-4 py-3 text-right">Preference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allocations.map((a) => (
                      <tr key={a.studentId} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{a.studentName}</td>
                        <td className="px-4 py-2.5">
                          <CategoryBadge category={a.category} />
                        </td>
                        <td className="px-4 py-2.5 text-right">{a.marks}</td>
                        <td className="px-4 py-2.5">{a.courseName}</td>
                        <td className="px-4 py-2.5">
                          <SeatBadge seatType={a.seatType} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <PreferencePill priority={a.preferencePriority} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function RejectionPill({ rate }: { rate: number }) {
  const pct = Math.round(rate * 1000) / 10;
  const tone = rate >= 0.5 ? "text-red-600" : rate >= 0.25 ? "text-amber-600" : "text-slate-500";
  return <span className={`font-medium ${tone}`}>{pct}%</span>;
}

function PreferencePill({ priority }: { priority: number }) {
  const tone =
    priority === 1 ? "bg-emerald-100 text-emerald-800" : priority === 2 ? "bg-amber-100 text-amber-800" : "bg-orange-100 text-orange-800";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tone}`}>#{priority}</span>;
}
