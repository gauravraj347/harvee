import type { RequestHandler } from "express";

/**
 * Wraps an async controller so any rejected promise is forwarded to Express's error
 * pipeline (next(err)) instead of crashing the process or hanging the request.
 */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
