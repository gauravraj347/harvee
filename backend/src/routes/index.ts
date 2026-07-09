import { Router } from "express";
import studentsRoutes from "../modules/students/students.routes";
import coursesRoutes from "../modules/courses/courses.routes";
import allocationsRoutes from "../modules/allocations/allocations.routes";
import analyticsRoutes from "../modules/analytics/analytics.routes";
import assistantRoutes from "../modules/assistant/assistant.routes";

/** Mounts every feature router under /api. */
const api = Router();

api.use("/students", studentsRoutes);
api.use("/courses", coursesRoutes);
api.use("/allocations", allocationsRoutes);
api.use("/stats", analyticsRoutes);
api.use("/assistant", assistantRoutes);

export default api;
