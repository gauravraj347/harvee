import { prisma } from "../../db/prisma";
import { computeAllocations } from "./allocation.engine";

export type AllocationRunSummary = {
  totalStudents: number;
  allocated: number;
  unallocated: number;
  gotFirstPreference: number;
  byCourse: { courseId: number; courseName: string; allocated: number; totalSeats: number }[];
};

/**
 * Load inputs, compute the allocation with the pure engine, and persist it atomically
 * (old allocations are cleared and replaced). Returns a summary of the run.
 */
export async function runAllocation(): Promise<AllocationRunSummary> {
  const [students, courses] = await Promise.all([
    prisma.student.findMany({
      select: {
        id: true,
        marks: true,
        category: true,
        applicationDate: true,
        preferences: { select: { courseId: true, priority: true } },
      },
    }),
    prisma.course.findMany({
      select: {
        id: true,
        name: true,
        totalSeats: true,
        quotas: { select: { category: true, reservedSeats: true } },
      },
    }),
  ]);

  const results = computeAllocations(students, courses);

  await prisma.$transaction([
    prisma.allocation.deleteMany(),
    prisma.allocation.createMany({ data: results }),
  ]);

  const perCourse = new Map<number, number>();
  let gotFirst = 0;
  for (const r of results) {
    perCourse.set(r.courseId, (perCourse.get(r.courseId) ?? 0) + 1);
    if (r.preferencePriority === 1) gotFirst += 1;
  }

  return {
    totalStudents: students.length,
    allocated: results.length,
    unallocated: students.length - results.length,
    gotFirstPreference: gotFirst,
    byCourse: courses.map((c) => ({
      courseId: c.id,
      courseName: c.name,
      allocated: perCourse.get(c.id) ?? 0,
      totalSeats: c.totalSeats,
    })),
  };
}

/** The current allocation result — one row per allocated student. */
export async function listAllocations() {
  const allocations = await prisma.allocation.findMany({
    orderBy: [{ course: { name: "asc" } }, { student: { marks: "desc" } }],
    include: {
      student: { select: { id: true, name: true, category: true, marks: true } },
      course: { select: { name: true } },
    },
  });
  return allocations.map((a) => ({
    studentId: a.studentId,
    studentName: a.student.name,
    category: a.student.category,
    marks: a.student.marks,
    courseName: a.course.name,
    seatType: a.seatType,
    preferencePriority: a.preferencePriority,
  }));
}
