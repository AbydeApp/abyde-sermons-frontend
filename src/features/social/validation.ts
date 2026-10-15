import { PLATFORMS } from "@/constants/brand";
import type { ContentItem, ContentType, SocialCapability, SocialPlatform } from "@/types";

export type MediaKind = "none" | "image" | "carousel" | "video";

export interface PublishInput {
  platform: SocialPlatform;
  capability?: SocialCapability;
  caption: string;
  title?: string;
  mediaKind: MediaKind;
  /** The rendered media exists and is ready to attach. */
  mediaReady: boolean;
  videoSeconds?: number;
}

/** What kind of media a content item will publish with. */
export function mediaKindOf(c: Pick<ContentItem, "structured" | "visual">): MediaKind {
  if (c.structured?.reel) return "video";
  if (c.structured?.carousel) return "carousel";
  return c.visual?.assets.length || c.visual?.status === "RENDERING" ? "image" : "none";
}

/**
 * Platform-specific problems that block publishing. Limits come from GET /social/capabilities
 * and are never hard-coded here.
 */
export function validatePublish(i: PublishInput): string[] {
  const cap = i.capability;
  const name = PLATFORMS[i.platform].label;
  if (!cap) return [`${name} isn't available right now.`];
  const problems: string[] = [];
  const video = cap.supportedMedia.includes("video");
  const image = cap.supportedMedia.includes("image");

  if (i.mediaKind === "none") {
    if (cap.requiresMedia) problems.push(video && !image ? `${name} needs a video.` : `${name} needs an image or video — create a visual first.`);
  } else {
    if (!cap.supportedMedia.includes(i.mediaKind)) problems.push(`${name} can't publish ${i.mediaKind === "carousel" ? "carousels" : i.mediaKind === "video" ? "video" : "images"}.`);
    else if (!i.mediaReady) problems.push(`Render the ${i.mediaKind === "video" ? "video" : "visual"} before posting to ${name}.`);
  }
  const over = i.caption.length - cap.maxCaptionLength;
  if (over > 0) problems.push(`Caption is ${over} character${over === 1 ? "" : "s"} over ${name}'s ${cap.maxCaptionLength.toLocaleString()} limit.`);
  if (cap.requiresTitle && !i.title?.trim()) problems.push(`${name} needs a title.`);
  if (cap.maxVideoSeconds && i.mediaKind === "video" && i.videoSeconds !== undefined && i.videoSeconds > cap.maxVideoSeconds) {
    problems.push(`The clip is ${Math.round(i.videoSeconds)}s; ${name} allows up to ${cap.maxVideoSeconds}s.`);
  }
  if (cap.maxHashtags !== undefined) {
    const tags = (i.caption.match(/#\w+/g) ?? []).length;
    if (tags > cap.maxHashtags) problems.push(`${name} allows up to ${cap.maxHashtags} hashtags (you have ${tags}).`);
  }
  return problems;
}

/** The caption a content item publishes with unless the user edits it. */
export function defaultCaption(c: Pick<ContentItem, "type" | "body" | "structured">): string {
  return c.structured?.reel?.caption ?? (c.type === "QUOTE" ? `“${c.body.replace(/^“|”$/g, "")}”` : c.body);
}

/** Content types that make sense as a social post. Devotionals, email, WhatsApp etc. are not posted from here. */
export const POSTABLE_TYPES: ContentType[] = ["SOCIAL_POST", "QUOTE"];

export function isPostable(c: Pick<ContentItem, "type" | "status">): boolean {
  return POSTABLE_TYPES.includes(c.type) && (c.status === "DRAFT" || c.status === "APPROVED");
}

export interface BulkEntry {
  item: ContentItem;
  /** Selected platforms this item can be posted to as written. */
  targets: SocialPlatform[];
  /** Selected platforms it can't, with the reasons. */
  skipped: { platform: SocialPlatform; reasons: string[] }[];
}

/** Checks every postable item against every chosen platform; nothing is truncated or edited. */
export function planBulkPost(items: ContentItem[], platforms: SocialPlatform[], caps: Map<SocialPlatform, SocialCapability>): BulkEntry[] {
  return items.filter(isPostable).map((item) => {
    const reel = item.structured?.reel;
    const targets: SocialPlatform[] = [];
    const skipped: BulkEntry["skipped"] = [];
    for (const platform of platforms) {
      const reasons = validatePublish({
        platform,
        capability: caps.get(platform),
        caption: defaultCaption(item),
        title: item.title,
        mediaKind: mediaKindOf(item),
        mediaReady: item.visual?.status === "READY",
        videoSeconds: reel ? (reel.endTimeMs - reel.startTimeMs) / 1000 : undefined,
      });
      if (reasons.length) skipped.push({ platform, reasons });
      else targets.push(platform);
    }
    return { item, targets, skipped };
  });
}
