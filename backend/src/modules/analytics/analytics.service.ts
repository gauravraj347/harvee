import { Category } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { CATEGORIES } from "../../common/constants";

/**
 * Analytics/reporting layer. Every function returns plain JSON-serializable data and
 * is consumed by BOTH the dashboard API and the AI Assistant's tools, so the numbers
 * the assistant quotes always match the dashboard exactly.
 */

export type CourseStat = {
  courseId: number;
  courseName: string;
  totalSeats: number;
  reservedSeats: number;
  openSeats: number;
  allocated: number;
  allocatedOpen: number;
  allocatedReserved: number;
  availableSeats: number;
  applicants: number; // distinct students who listed this course anywhere in preferences
  firstChoiceApplicants: number; // distinct students who listed it as priority 1
  rejected: number; // applicants who were NOT allocated to this course
  rejectionRate: number; // rejected / applicants (0..1)
};

async function coursesWithData() {
  return prisma.course.findMany({
    orderBy: { name: "asc" },
    include: {
      quotas: true,
      allocations: {
        include: { student: { select: { id: true, name: true, category: true } } },
      },
      preferences: { select: { studentId: true, priority: true } },
    },
  });
}

export async function getCourseStatistics(): Promise<CourseStat[]> {
  const courses = await coursesWithData();

  return courses.map((course) => {
    const reservedSeats = course.quotas.reduce((s, q) => s + q.reservedSeats, 0);
    const openSeats = Math.max(0, course.totalSeats - reservedSeats);

    const allocatedOpen = course.allocations.filter((a) => a.seatType === "OPEN").length;
    const allocatedReserved = course.allocations.filter((a) => a.seatType === "RESERVED").length;
    const allocated = course.allocations.length;

    const applicantIds = new Set(course.preferences.map((p) => p.studentId));
    const firstChoiceIds = new Set(
      course.preferences.filter((p) => p.priority === 1).map((p) => p.studentId)
    );
    const applicants = applicantIds.size;
    const rejected = Math.max(0, applicants - allocated);

    return {
      courseId: course.id,
      courseName: course.name,
      totalSeats: course.totalSeats,
      reservedSeats,
      openSeats,
      allocated,
      allocatedOpen,
      allocatedReserved,
      availableSeats: course.totalSeats - allocated,
      applicants,
      firstChoiceApplicants: firstChoiceIds.size,
      rejected,
      rejectionRate: applicants > 0 ? rejected / applicants : 0,
    };
  });
}

/** Q: "How many students were allocated to each course?" */
export async function getAllocationsPerCourse() {
  const stats = await getCourseStatistics();
  return stats.map((s) => ({
    courseName: s.courseName,
    allocated: s.allocated,
    totalSeats: s.totalSeats,
    availableSeats: s.availableSeats,
  }));
}

/** Q: "Which course had the highest rejection rate?" */
export async function getCourseRejectionRates() {
  const stats = await getCourseStatistics();
  const ranked = [...stats]
    .filter((s) => s.applicants > 0)
    .sort((a, b) => b.rejectionRate - a.rejectionRate)
    .map((s) => ({
      courseName: s.courseName,
      applicants: s.applicants,
      allocated: s.allocated,
      rejected: s.rejected,
      rejectionRatePercent: Math.round(s.rejectionRate * 1000) / 10,
    }));
  return {
    highestRejectionCourse: ranked[0] ?? null,
    ranking: ranked,
  };
}

/** Q: "Which students did not receive their first preference?" */
export async function getStudentsWithoutFirstPreference() {
  const students = await prisma.student.findMany({
    orderBy: [{ marks: "desc" }, { applicationDate: "asc" }],
    include: {
      preferences: { include: { course: { select: { name: true } } }, orderBy: { priority: "asc" } },
      allocation: { include: { course: { select: { name: true } } } },
    },
  });

  const rows = students
    .filter((s) => !s.allocation || s.allocation.preferencePriority !== 1)
    .map((s) => {
      const firstPref = s.preferences.find((p) => p.priority === 1);
      return {
        studentId: s.id,
        name: s.name,
        category: s.category,
        marks: s.marks,
        firstPreference: firstPref?.course.name ?? null,
        allocatedCourse: s.allocation?.course.name ?? null,
        allocatedPreferencePriority: s.allocation?.preferencePriority ?? null,
        status: s.allocation ? ("LOWER_PREFERENCE" as const) : ("UNALLOCATED" as const),
      };
    });

  return { count: rows.length, students: rows };
}

/** Q: "Show category-wise allocation summary." */
export async function getCategoryAllocationSummary() {
  const students = await prisma.student.findMany({
    select: { category: true, allocation: { select: { seatType: true } } },
  });

  return CATEGORIES.map((category) => {
    const inCat = students.filter((s) => s.category === category);
    const allocated = inCat.filter((s) => s.allocation);
    return {
      category: category as Category,
      totalStudents: inCat.length,
      allocated: allocated.length,
      unallocated: inCat.length - allocated.length,
      viaOpenSeat: allocated.filter((s) => s.allocation?.seatType === "OPEN").length,
      viaReservedSeat: allocated.filter((s) => s.allocation?.seatType === "RESERVED").length,
    };
  });
}

/** Top-line numbers for the dashboard header. */
export async function getOverview() {
  const [totalStudents, totalCourses, totalAllocated, firstPrefCount, seatAgg] = await Promise.all([
    prisma.student.count(),
    prisma.course.count(),
    prisma.allocation.count(),
    prisma.allocation.count({ where: { preferencePriority: 1 } }),
    prisma.course.aggregate({ _sum: { totalSeats: true } }),
  ]);

  const totalSeats = seatAgg._sum.totalSeats ?? 0;
  return {
    totalStudents,
    totalCourses,
    totalSeats,
    totalAllocated,
    unallocated: totalStudents - totalAllocated,
    availableSeats: totalSeats - totalAllocated,
    gotFirstPreference: firstPrefCount,
  };
}

/** Convenience bundle powering the dashboard in a single request. */
export async function getFullReport() {
  const [overview, courseStats, allocationsPerCourse, rejection, withoutFirst, byCategory] =
    await Promise.all([
      getOverview(),
      getCourseStatistics(),
      getAllocationsPerCourse(),
      getCourseRejectionRates(),
      getStudentsWithoutFirstPreference(),
      getCategoryAllocationSummary(),
    ]);
  return { overview, courseStats, allocationsPerCourse, rejection, withoutFirst, byCategory };
}
