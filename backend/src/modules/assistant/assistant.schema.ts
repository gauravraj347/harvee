import { z } from "zod";

export const askAssistantSchema = z.object({
  question: z.string().trim().min(1, "A non-empty 'question' is required.").max(1000),
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;
