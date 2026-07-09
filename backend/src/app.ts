import express, { type Express } from "express";
import cors from "cors";
import { env } from "./config/env";
import { requestLogger } from "./middleware/request-logger";
import { notFound } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";
import apiRoutes from "./routes";

/** Builds and configures the Express application (no listening — see server.ts). */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : true }));
  app.use(express.json());
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "course-allocation-api" });
  });

  app.use("/api", apiRoutes);

  // 404 + centralized error handling (must be last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
