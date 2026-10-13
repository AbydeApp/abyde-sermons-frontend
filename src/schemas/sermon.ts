import { z } from "zod";
import { ACCEPTED_SERMON_FILES } from "@/constants/content";

export const sermonMetaSchema = z.object({
  title: z.string().trim().min(2, "Give the sermon a title"),
  speaker: z.string().trim().min(2, "Who preached this message?"),
  date: z.string().min(1, "Choose the date it was preached"),
  series: z.string().trim().optional(),
  mainScripture: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});
export type SermonMetaValues = z.infer<typeof sermonMetaSchema>;

export function validateSermonFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_SERMON_FILES.extensions.some((ext) => name.endsWith(ext))) {
    return `Unsupported file type. Use ${ACCEPTED_SERMON_FILES.label}.`;
  }
  if (file.size > ACCEPTED_SERMON_FILES.maxBytes) return "That file is larger than 2 GB.";
  if (file.size === 0) return "That file is empty.";
  return null;
}
