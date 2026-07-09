import type { RequestHandler } from "express";

/** 404 for unmatched routes. */
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};
