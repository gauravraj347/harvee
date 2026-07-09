import "dotenv/config";
import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed data is intentionally oversubscribed (26 students competing for 22 seats)
 * so the allocation run demonstrates every business rule:
 *  - merit ordering (higher marks win)
 *  - tie-break by earlier application date (see the two 88.0 students)
 *  - reservation (a high-merit reserved student takes an OPEN seat, leaving the
 *    reserved seat for a lower-merit same-category student)
 *  - preference fallback (1st choice full -> 2nd/3rd evaluated)
 *  - rejections (Computer Science is heavily oversubscribed)
 */

type CourseSeed = {
  name: string;
  totalSeats: number;
  quotas: Partial<Record<Category, number>>; // reserved seats by category
};

const COURSES: CourseSeed[] = [
  { name: "Computer Science", totalSeats: 6, quotas: { OBC: 2, SC: 1, ST: 1 } }, // open = 2
  { name: "Information Technology", totalSeats: 4, quotas: { OBC: 1, SC: 1 } }, //  open = 2
  { name: "Electronics", totalSeats: 5, quotas: { OBC: 1, SC: 1 } }, //             open = 3
  { name: "Mechanical", totalSeats: 4, quotas: { OBC: 1 } }, //                     open = 3
  { name: "Civil", totalSeats: 3, quotas: { OBC: 1 } }, //                          open = 2
];

type StudentSeed = {
  name: string;
  marks: number;
  category: Category;
  applicationDate: string; // ISO
  preferences: string[]; // course names, priority 1..n
};

const CS = "Computer Science";
const IT = "Information Technology";
const EC = "Electronics";
const ME = "Mechanical";
const CV = "Civil";

const STUDENTS: StudentSeed[] = [
  { name: "Aarav Sharma", marks: 95.0, category: "GENERAL", applicationDate: "2025-06-01T09:00:00Z", preferences: [CS, IT, EC] },
  { name: "Diya Verma", marks: 93.5, category: "OBC", applicationDate: "2025-06-01T10:30:00Z", preferences: [CS, IT, EC] },
  { name: "Kabir Singh", marks: 92.0, category: "GENERAL", applicationDate: "2025-06-02T08:15:00Z", preferences: [CS, EC, ME] },
  { name: "Ananya Rao", marks: 91.0, category: "SC", applicationDate: "2025-06-01T14:00:00Z", preferences: [CS, IT, EC] },
  { name: "Vivaan Gupta", marks: 90.0, category: "GENERAL", applicationDate: "2025-06-03T09:45:00Z", preferences: [CS, IT, ME] },
  { name: "Ishaan Khan", marks: 89.0, category: "ST", applicationDate: "2025-06-02T11:20:00Z", preferences: [CS, EC, CV] },
  // Tie on marks (88.0): Meera applied earlier than Rohan -> Meera wins the tie.
  { name: "Meera Nair", marks: 88.0, category: "OBC", applicationDate: "2025-06-01T09:30:00Z", preferences: [CS, IT, EC] },
  { name: "Rohan Das", marks: 88.0, category: "GENERAL", applicationDate: "2025-06-04T16:00:00Z", preferences: [CS, IT, ME] },
  { name: "Saanvi Iyer", marks: 87.0, category: "GENERAL", applicationDate: "2025-06-02T10:00:00Z", preferences: [CS, EC, CV] },
  { name: "Aditya Menon", marks: 86.5, category: "SC", applicationDate: "2025-06-03T13:30:00Z", preferences: [IT, CS, EC] },
  { name: "Myra Joshi", marks: 85.0, category: "OBC", applicationDate: "2025-06-02T09:10:00Z", preferences: [IT, EC, ME] },
  { name: "Arjun Reddy", marks: 84.0, category: "GENERAL", applicationDate: "2025-06-05T08:00:00Z", preferences: [CS, EC, ME] },
  { name: "Anika Bose", marks: 83.5, category: "ST", applicationDate: "2025-06-01T12:00:00Z", preferences: [EC, IT, CV] },
  { name: "Reyansh Pillai", marks: 82.0, category: "GENERAL", applicationDate: "2025-06-04T09:00:00Z", preferences: [EC, ME, CV] },
  { name: "Sara Chauhan", marks: 81.0, category: "OBC", applicationDate: "2025-06-03T15:45:00Z", preferences: [IT, EC, ME] },
  { name: "Krishna Yadav", marks: 80.0, category: "SC", applicationDate: "2025-06-02T14:20:00Z", preferences: [ME, EC, CV] },
  { name: "Aadhya Mishra", marks: 79.0, category: "GENERAL", applicationDate: "2025-06-06T10:00:00Z", preferences: [EC, ME, CV] },
  { name: "Dhruv Kapoor", marks: 78.0, category: "GENERAL", applicationDate: "2025-06-05T11:30:00Z", preferences: [ME, CV, EC] },
  { name: "Prisha Malhotra", marks: 77.0, category: "OBC", applicationDate: "2025-06-04T08:45:00Z", preferences: [CV, ME, EC] },
  { name: "Aryan Chopra", marks: 76.0, category: "GENERAL", applicationDate: "2025-06-07T09:15:00Z", preferences: [ME, CV, IT] },
  { name: "Riya Saxena", marks: 75.0, category: "ST", applicationDate: "2025-06-03T10:10:00Z", preferences: [CV, EC, ME] },
  { name: "Kiara Bhat", marks: 74.0, category: "SC", applicationDate: "2025-06-05T13:00:00Z", preferences: [ME, CV, IT] },
  { name: "Veer Sinha", marks: 72.0, category: "GENERAL", applicationDate: "2025-06-06T09:30:00Z", preferences: [CV, ME, EC] },
  { name: "Navya Pandey", marks: 70.0, category: "OBC", applicationDate: "2025-06-07T14:00:00Z", preferences: [CV, IT, ME] },
  { name: "Kabir Jain", marks: 68.0, category: "GENERAL", applicationDate: "2025-06-08T08:00:00Z", preferences: [CS, ME, CV] },
  { name: "Tara Shetty", marks: 65.0, category: "SC", applicationDate: "2025-06-08T09:00:00Z", preferences: [CS, IT, EC] },
];

async function main() {
  // Idempotent reset (respects FK order via cascade, but be explicit).
  await prisma.allocation.deleteMany();
  await prisma.studentPreference.deleteMany();
  await prisma.courseCategoryQuota.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();

  // Courses + quotas
  const courseByName = new Map<string, number>();
  for (const c of COURSES) {
    const created = await prisma.course.create({
      data: {
        name: c.name,
        totalSeats: c.totalSeats,
        quotas: {
          create: Object.entries(c.quotas).map(([category, reservedSeats]) => ({
            category: category as Category,
            reservedSeats: reservedSeats ?? 0,
          })),
        },
      },
    });
    courseByName.set(c.name, created.id);
  }

  // Students + preferences
  for (const s of STUDENTS) {
    await prisma.student.create({
      data: {
        name: s.name,
        marks: s.marks,
        category: s.category,
        applicationDate: new Date(s.applicationDate),
        preferences: {
          create: s.preferences.map((courseName, idx) => ({
            courseId: courseByName.get(courseName)!,
            priority: idx + 1,
          })),
        },
      },
    });
  }

  const [courses, students] = await Promise.all([
    prisma.course.count(),
    prisma.student.count(),
  ]);
  console.log(`Seeded ${courses} courses and ${students} students.`);
  console.log("Run the allocation from the dashboard, or POST /api/allocations/run.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
