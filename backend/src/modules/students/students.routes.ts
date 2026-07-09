import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import * as controller from "./students.controller";

const router = Router();

router.get("/", asyncHandler(controller.listStudents));
router.post("/", asyncHandler(controller.registerStudent));

export default router;
