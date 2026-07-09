import { Category, SeatType } from "@prisma/client";

/**
 * Pure allocation engine — no database access, fully unit-testable.
 *
 * Algorithm (single-pass, merit-ordered, seat-type aware):
 *   1. Rank every student by merit: marks DESC, then earlier applicationDate first.
 *   2. For each course pre-compute openSeats (= totalSeats - Σ reservedSeats) and the
 *      reserved seats per category.
 *   3. Walk students in merit order; for each, try preferences in priority order and
 *      take the first available seat: an OPEN seat if any remain (open/merit seats are
 *      available to every category, so a high-merit reserved-category student consumes
 *      an open seat and leaves the reserved seat for a lower-merit peer), else a
 *      category-RESERVED seat, else move to the next preference.
 *   4. A student whose every preference is full stays unallocated (rejected).
 *
 * Deterministic and idempotent: same inputs always produce the same result.
 */

export type StudentForAllocation = {
  id: number;
  marks: number;
  category: Category;
  applicationDate: Date;
  preferences: { courseId: number; priority: number }[];
};

export type CourseForAllocation = {
  id: number;
  totalSeats: number;
  quotas: { category: Category; reservedSeats: number }[];
};

export type AllocationResult = {
  studentId: number;
  courseId: number;
  seatType: SeatType;
  preferencePriority: number;
};

type CourseSeats = {
  openRemaining: number;
  reservedRemaining: Record<Category, number>;
};

/** Rank by marks DESC, then earlier application date first. */
export function meritCompare(
  a: Pick<StudentForAllocation, "marks" | "applicationDate">,
  b: Pick<StudentForAllocation, "marks" | "applicationDate">
): number {
  if (b.marks !== a.marks) return b.marks - a.marks; // higher marks first
  return a.applicationDate.getTime() - b.applicationDate.getTime(); // earlier first
}

export function computeAllocations(
  students: StudentForAllocation[],
  courses: CourseForAllocation[]
): AllocationResult[] {
  const seats = new Map<number, CourseSeats>();
  for (const course of courses) {
    const reservedRemaining: Record<Category, number> = { GENERAL: 0, OBC: 0, SC: 0, ST: 0 };
    let reservedTotal = 0;
    for (const q of course.quotas) {
      if (q.category === "GENERAL") continue; // GENERAL rows, if any, count as open
      reservedRemaining[q.category] = q.reservedSeats;
      reservedTotal += q.reservedSeats;
    }
    seats.set(course.id, {
      openRemaining: Math.max(0, course.totalSeats - reservedTotal),
      reservedRemaining,
    });
  }

  const ranked = [...students].sort(meritCompare);
  const results: AllocationResult[] = [];

  for (const student of ranked) {
    const prefs = [...student.preferences].sort((a, b) => a.priority - b.priority);
    for (const pref of prefs) {
      const seat = seats.get(pref.courseId);
      if (!seat) continue; // preference points at a course that no longer exists

      if (seat.openRemaining > 0) {
        seat.openRemaining -= 1;
        results.push({ studentId: student.id, courseId: pref.courseId, seatType: "OPEN", preferencePriority: pref.priority });
        break;
      }

      if (student.category !== "GENERAL" && seat.reservedRemaining[student.category] > 0) {
        seat.reservedRemaining[student.category] -= 1;
        results.push({ studentId: student.id, courseId: pref.courseId, seatType: "RESERVED", preferencePriority: pref.priority });
        break;
      }
    }
  }

  return results;
}
