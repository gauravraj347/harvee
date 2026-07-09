import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../common/errors";
import type { CourseInput } from "./courses.schema";

/** List courses with quotas and live allocated/applicant counts. */
export function listCourses() {
  return prisma.course.findMany({
    orderBy: { name: "asc" },
    include: {
      quotas: true,
      _count: { select: { allocations: true, preferences: true } },
    },
  });
}

export async function getCourse(id: number) {
  const course = await prisma.course.findUnique({ where: { id }, include: { quotas: true } });
  if (!course) throw new NotFoundError("Course not found");
  return course;
}

export function createCourse(data: CourseInput) {
  return prisma.course.create({
    data: {
      name: data.name,
      totalSeats: data.totalSeats,
      quotas: {
        create: data.quotas.map((q) => ({ category: q.category, reservedSeats: q.reservedSeats })),
      },
    },
    include: { quotas: true },
  });
}

/** Replace name, totalSeats and quotas atomically. */
export function updateCourse(id: number, data: CourseInput) {
  return prisma.$transaction(async (tx) => {
    await tx.courseCategoryQuota.deleteMany({ where: { courseId: id } });
    return tx.course.update({
      where: { id },
      data: {
        name: data.name,
        totalSeats: data.totalSeats,
        quotas: {
          create: data.quotas.map((q) => ({ category: q.category, reservedSeats: q.reservedSeats })),
        },
      },
      include: { quotas: true },
    });
  });
}

/** Delete a course; cascades to quotas, preferences and allocations. */
export function deleteCourse(id: number) {
  return prisma.course.delete({ where: { id } });
}
