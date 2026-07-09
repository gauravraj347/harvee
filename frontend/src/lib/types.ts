// Plain, runtime-free types shared between the API responses and the client UI.

export type Category = "GENERAL" | "OBC" | "SC" | "ST";
export type SeatType = "OPEN" | "RESERVED";

export type Overview = {
  totalStudents: number;
  totalCourses: number;
  totalSeats: number;
  totalAllocated: number;
  unallocated: number;
  availableSeats: number;
  gotFirstPreference: number;
};

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
  applicants: number;
  firstChoiceApplicants: number;
  rejected: number;
  rejectionRate: number;
};

export type AllocationPerCourse = {
  courseName: string;
  allocated: number;
  totalSeats: number;
  availableSeats: number;
};

export type RejectionReport = {
  highestRejectionCourse:
    | { courseName: string; applicants: number; allocated: number; rejected: number; rejectionRatePercent: number }
    | null;
  ranking: {
    courseName: string;
    applicants: number;
    allocated: number;
    rejected: number;
    rejectionRatePercent: number;
  }[];
};

export type WithoutFirstPreference = {
  count: number;
  students: {
    studentId: number;
    name: string;
    category: Category;
    marks: number;
    firstPreference: string | null;
    allocatedCourse: string | null;
    allocatedPreferencePriority: number | null;
    status: "UNALLOCATED" | "LOWER_PREFERENCE";
  }[];
};

export type CategorySummary = {
  category: Category;
  totalStudents: number;
  allocated: number;
  unallocated: number;
  viaOpenSeat: number;
  viaReservedSeat: number;
};

export type FullReport = {
  overview: Overview;
  courseStats: CourseStat[];
  allocationsPerCourse: AllocationPerCourse[];
  rejection: RejectionReport;
  withoutFirst: WithoutFirstPreference;
  byCategory: CategorySummary[];
};

export type AllocationRow = {
  studentId: number;
  studentName: string;
  category: Category;
  marks: number;
  courseName: string;
  seatType: SeatType;
  preferencePriority: number;
};

export type CourseWithQuotas = {
  id: number;
  name: string;
  totalSeats: number;
  quotas: { id: number; category: Category; reservedSeats: number }[];
  _count?: { allocations: number; preferences: number };
};

export type StudentRow = {
  id: number;
  name: string;
  marks: number;
  category: Category;
  applicationDate: string;
  preferences: { priority: number; course: { id: number; name: string } }[];
  allocation: { preferencePriority: number; seatType: SeatType; course: { id: number; name: string } } | null;
};

export type AllocationRunSummary = {
  totalStudents: number;
  allocated: number;
  unallocated: number;
  gotFirstPreference: number;
  byCourse: { courseId: number; courseName: string; allocated: number; totalSeats: number }[];
};
