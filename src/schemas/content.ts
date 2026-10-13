import { z } from "zod";

export const contentEditSchema = z.object({
  title: z.string().trim().min(1, "Add a title"),
  body: z.string().trim().min(1, "Content can't be empty"),
  scripture: z.string().trim().optional(),
});
export type ContentEditValues = z.infer<typeof contentEditSchema>;
