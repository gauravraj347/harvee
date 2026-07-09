import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import * as controller from "./courses.controller";

const router = Router();

router.get("/", asyncHandler(controller.listCourses));
router.post("/", asyncHandler(controller.createCourse));
router.get("/:id", asyncHandler(controller.getCourse));
router.put("/:id", asyncHandler(controller.updateCourse));
router.delete("/:id", asyncHandler(controller.deleteCourse));

export default router;
