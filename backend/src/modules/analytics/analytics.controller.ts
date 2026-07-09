import type { Request, Response } from "express";
import * as analyticsService from "./analytics.service";

// Everything the dashboard needs in a single call.
export async function getStats(_req: Request, res: Response) {
  res.json(await analyticsService.getFullReport());
}
