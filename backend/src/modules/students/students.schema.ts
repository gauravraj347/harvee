import { z } from "zod";
import { categorySchema } from "../../common/constants";

/** `preferences` is an ordered list of course ids; index 0 = priority 1. */
export const studentRegistrationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  marks: z.number().min(0, "Marks cannot be negative").max(100, "Marks cannot exceed 100"),
  category: categorySchema,
  applicationDate: z
    .string()
    .datetime({ message: "applicationDate must be an ISO datetime" })
    .optional(),
  preferences: z
    .array(z.number().int().positive())
    .min(1, "At least one preferred course is required")
    .max(5, "At most 5 preferences allowed")
    .refine((ids) => new Set(ids).size === ids.length, "Preferences must be unique courses"),
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
