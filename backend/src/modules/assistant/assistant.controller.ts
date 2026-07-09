import type { Request, Response } from "express";
import { askAssistantSchema } from "./assistant.schema";
import { askAssistant } from "./assistant.service";

export async function ask(req: Request, res: Response) {
  const { question } = askAssistantSchema.parse(req.body);
  res.json(await askAssistant(question));
}
