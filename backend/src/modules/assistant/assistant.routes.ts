import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import * as controller from "./assistant.controller";

const router = Router();

router.post("/", asyncHandler(controller.ask));

export default router;
