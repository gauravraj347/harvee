import { z } from "zod";
import { RESERVED_CATEGORIES } from "../../common/constants";

export const courseQuotaSchema = z.object({
  category: z.enum(RESERVED_CATEGORIES), // GENERAL seats are the open pool, never "reserved"
  reservedSeats: z.number().int().min(0),
});

export const courseSchema = z
  .object({
    name: z.string().trim().min(1, "Course name is required").max(120),
    totalSeats: z.number().int().positive("Total seats must be positive"),
    quotas: z.array(courseQuotaSchema).optional().default([]),
  })
  .refine((c) => new Set(c.quotas.map((q) => q.category)).size === c.quotas.length, {
    message: "Duplicate category in quotas",
    path: ["quotas"],
  })
  .refine((c) => c.quotas.reduce((sum, q) => sum + q.reservedSeats, 0) <= c.totalSeats, {
    message: "Reserved seats cannot exceed total seats",
    path: ["quotas"],
  });

export type CourseInput = z.infer<typeof courseSchema>;
