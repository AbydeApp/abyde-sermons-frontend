import type {
  BrandAssetKind,
  ContentType,
  EmojiUsage,
  SocialPlatform,
  SocialProvider,
  TemplateCategory,
  VisualFormat,
  WatermarkPosition,
} from "@/types";

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string; format: VisualFormat }[] = [
  { value: "SERMON_QUOTE", label: "Sermon Quote", format: "instagram-portrait" },
  { value: "SCRIPTURE", label: "Scripture", format: "instagram-square" },
  { value: "PRAYER_POINT", label: "Prayer Point", format: "instagram-portrait" },
  { value: "DEVOTIONAL", label: "Devotional", format: "instagram-portrait" },
  { value: "CAROUSEL", label: "Sermon Notes / Carousel", format: "carousel-slide" },
  { value: "SUNDAY_INVITATION", label: "Sunday Invitation", format: "instagram-portrait" },
  { value: "ANNOUNCEMENT", label: "Announcement", format: "instagram-square" },
  { value: "TESTIMONY", label: "Testimony", format: "instagram-portrait" },
  { value: "REEL", label: "Reel / Short", format: "story" },
  { value: "YOUTUBE_THUMBNAIL", label: "YouTube Thumbnail", format: "youtube-thumbnail" },
];

export const FORMATS: Record<VisualFormat, { label: string; width: number; height: number }> = {
  "instagram-portrait": { label: "Instagram portrait", width: 1080, height: 1350 },
  "instagram-square": { label: "Instagram square", width: 1080, height: 1080 },
  "carousel-slide": { label: "Carousel slide", width: 1080, height: 1350 },
  story: { label: "Story / Reel 9:16", width: 1080, height: 1920 },
  facebook: { label: "Facebook post", width: 1200, height: 630 },
  "youtube-thumbnail": { label: "YouTube thumbnail", width: 1280, height: 720 },
};

export const FORMAT_ORDER: VisualFormat[] = ["instagram-portrait", "instagram-square", "carousel-slide", "story", "facebook", "youtube-thumbnail"];

/** Content types that can get a visual, and the template category each uses. */
export function categoryFor(type: ContentType, opts: { carousel?: boolean; hasScripture?: boolean } = {}): TemplateCategory | null {
  switch (type) {
    case "QUOTE":
      return "SERMON_QUOTE";
    case "PRAYER":
      return "PRAYER_POINT";
    case "DEVOTIONAL":
      return "DEVOTIONAL";
    case "VIDEO_IDEA":
      return "REEL";
    case "SOCIAL_POST":
      return opts.carousel ? "CAROUSEL" : opts.hasScripture ? "SCRIPTURE" : "SERMON_QUOTE";
    default:
      return null;
  }
}

export const FONT_OPTIONS = ["Inter", "Fraunces", "Playfair Display", "Montserrat", "Lora", "Poppins", "DM Serif Display", "Merriweather", "Oswald", "Nunito"];

export const FONTS_STYLESHEET =
  "https://fonts.googleapis.com/css2?" +
  FONT_OPTIONS.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&") +
  "&display=swap";

export const TONES = ["Formal", "Warm & Conversational", "Youthful", "Inspirational", "Teaching-focused"];
export const EMOJI_LEVELS: { value: EmojiUsage; label: string }[] = [
  { value: "none", label: "None" },
  { value: "rarely", label: "Rarely" },
  { value: "occasionally", label: "Occasionally" },
  { value: "frequently", label: "Frequently" },
];

export const WATERMARK_POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "center", label: "Center" },
];

export const ASSET_KINDS: { value: BrandAssetKind; label: string; hint: string }[] = [
  { value: "LOGO", label: "Logos", hint: "Primary and light logo files" },
  { value: "PORTRAIT", label: "Pastor / speaker portraits", hint: "Used by photo templates" },
  { value: "VENUE", label: "Church building & interior", hint: "Backgrounds for invitations" },
  { value: "TEXTURE", label: "Background textures", hint: "Subtle patterns and gradients" },
  { value: "STOCK", label: "Approved stock images", hint: "Licensed or brand-approved imagery" },
  { value: "WATERMARK", label: "Watermarks", hint: "Overlay marks for graphics and reels" },
];

export const PLATFORMS: Record<SocialPlatform, { label: string; glyph: string; provider: SocialProvider }> = {
  facebook: { label: "Facebook", glyph: "f", provider: "meta" },
  instagram: { label: "Instagram", glyph: "ig", provider: "meta" },
  tiktok: { label: "TikTok", glyph: "tt", provider: "tiktok" },
  youtube: { label: "YouTube", glyph: "yt", provider: "youtube" },
  x: { label: "X", glyph: "x", provider: "x" },
  linkedin: { label: "LinkedIn", glyph: "in", provider: "linkedin" },
};

export const PLATFORM_ORDER: SocialPlatform[] = ["facebook", "instagram", "tiktok", "youtube", "x", "linkedin"];

export const SUBTITLE_STYLES = ["Clean", "Bold outline", "Karaoke highlight", "Minimal"];
