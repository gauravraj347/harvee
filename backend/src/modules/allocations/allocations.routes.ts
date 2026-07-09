import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import * as controller from "./allocations.controller";

const router = Router();

router.get("/", asyncHandler(controller.listAllocations));
router.post("/run", asyncHandler(controller.runAllocation));

export default router;
