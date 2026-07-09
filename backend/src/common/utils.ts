import { BadRequestError } from "./errors";

/** Parse a positive integer route param, throwing a 400 on anything else. */
export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError("Invalid id parameter");
  }
  return id;
}
