import { z } from "zod";

/** Reservation categories shared across schemas and analytics. */
export const CATEGORIES = ["GENERAL", "OBC", "SC", "ST"] as const;

/** Categories that can hold reserved seats (GENERAL is the open/merit pool). */
export const RESERVED_CATEGORIES = ["OBC", "SC", "ST"] as const;

export const categorySchema = z.enum(CATEGORIES);
