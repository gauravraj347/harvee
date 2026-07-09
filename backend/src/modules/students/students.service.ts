import { prisma } from "../../db/prisma";
import { BadRequestError } from "../../common/errors";
import type { StudentRegistrationInput } from "./students.schema";

/** List all students with their ranked preferences and current allocation. */
export function listStudents() {
  return prisma.student.findMany({
    orderBy: [{ marks: "desc" }, { applicationDate: "asc" }],
    include: {
      preferences: {
        orderBy: { priority: "asc" },
        include: { course: { select: { id: true, name: true } } },
      },
      allocation: { include: { course: { select: { id: true, name: true } } } },
    },
  });
}

/** Register a student, validating that every preferred course exists. */
export async function registerStudent(data: StudentRegistrationInput) {
  const courses = await prisma.course.findMany({
    where: { id: { in: data.preferences } },
    select: { id: true },
  });
  if (courses.length !== data.preferences.length) {
    const existing = new Set(courses.map((c) => c.id));
    const missing = data.preferences.filter((id) => !existing.has(id));
    throw new BadRequestError(`Unknown course id(s): ${missing.join(", ")}`);
  }

  return prisma.student.create({
    data: {
      name: data.name,
      marks: data.marks,
      category: data.category,
      applicationDate: data.applicationDate ? new Date(data.applicationDate) : undefined,
      preferences: {
        create: data.preferences.map((courseId, index) => ({ courseId, priority: index + 1 })),
      },
    },
    include: { preferences: { include: { course: { select: { name: true } } } } },
  });
}
