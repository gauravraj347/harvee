import type { Request, Response } from "express";
import * as allocationsService from "./allocations.service";

export async function listAllocations(_req: Request, res: Response) {
  res.json(await allocationsService.listAllocations());
}

export async function runAllocation(_req: Request, res: Response) {
  res.json(await allocationsService.runAllocation());
}
