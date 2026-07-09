import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import * as controller from "./analytics.controller";

const router = Router();

router.get("/", asyncHandler(controller.getStats));

export default router;
