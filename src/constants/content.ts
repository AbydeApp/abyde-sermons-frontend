import type { ContentStatus, ContentType, GenerationOption, IntegrationProvider } from "@/types";

export const CONTENT_TYPE_META: Record<
  ContentType,
  { label: string; short: string; glyph: string }
> = {
  DEVOTIONAL: { label: "Daily Devotional", short: "Devotional", glyph: "◐" },
  SOCIAL_POST: { label: "Social Post", short: "Social", glyph: "◆" },
  PRAYER: { label: "Prayer Points", short: "Prayer", glyph: "✦" },
  BIBLE_STUDY: { label: "Bible Study", short: "Study", glyph: "▤" },
  EMAIL: { label: "Email Newsletter", short: "Email", glyph: "✉" },
  WHATSAPP: { label: "WhatsApp Message", short: "WhatsApp", glyph: "●" },
  QUOTE: { label: "Quote", short: "Quote", glyph: "❝" },
  VIDEO_IDEA: { label: "Short-Video Idea", short: "Video", glyph: "▶" },
};

export const CONTENT_STATUS_META: Record<
  ContentStatus,
  { label: string; tone: "neutral" | "info" | "accent" | "success" | "danger" | "muted" }
> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  APPROVED: { label: "Approved", tone: "info" },
  SCHEDULED: { label: "Scheduled", tone: "accent" },
  PUBLISHED: { label: "Published", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  ARCHIVED: { label: "Archived", tone: "muted" },
};

export const GENERATION_OPTIONS: { type: GenerationOption; label: string; hint: string }[] = [
  { type: "DEVOTIONAL", label: "7 Daily Devotionals", hint: "One short reflection for each day" },
  { type: "SOCIAL_POST", label: "7 Social Posts", hint: "Ready for Instagram and Facebook" },
  { type: "PRAYER", label: "Prayer Points", hint: "Guided prayer from the message" },
  { type: "BIBLE_STUDY", label: "Bible Study", hint: "Discussion guide for small groups" },
  { type: "EMAIL", label: "Email Newsletter", hint: "A weekly recap for your church" },
  { type: "WHATSAPP", label: "WhatsApp Messages", hint: "Short, personal messages" },
  { type: "QUOTE", label: "Quote Extraction", hint: "Shareable lines from the sermon" },
  { type: "VIDEO_IDEA", label: "Short-Video Recommendations", hint: "Moments worth clipping" },
];

export const INTEGRATION_META: Record<IntegrationProvider, { name: string; description: string }> = {
  WHATSAPP: { name: "WhatsApp", description: "Send short messages to your community." },
  EMAIL: { name: "Email", description: "Send your weekly newsletter to subscribers." },
};

export const BIBLE_TRANSLATIONS = ["NIV", "ESV", "KJV", "NKJV", "NLT", "NASB", "CSB", "MSG", "AMP"];

export const ACCEPTED_SERMON_FILES = {
  extensions: [".mp3", ".wav", ".mp4", ".pdf", ".docx", ".txt"],
  label: "MP3, WAV, MP4, PDF, DOCX or TXT",
  maxBytes: 2 * 1024 ** 3,
};
