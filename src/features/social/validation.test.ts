import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@/services/mock/seed";
import type { ContentItem, SocialCapability, SocialPlatform } from "@/types";
import { defaultCaption, mediaKindOf, planBulkPost, validatePublish } from "./validation";

const cap = (p: SocialPlatform) => CAPABILITIES.find((c) => c.platform === p) as unknown as SocialCapability;
const base = { caption: "Hello", mediaKind: "none" as const, mediaReady: false };

describe("publish validation (capability driven)", () => {
  it("requires media for Instagram", () => {
    expect(validatePublish({ ...base, platform: "instagram", capability: cap("instagram") })[0]).toMatch(/needs an image or video/);
  });
  it("requires video for TikTok and YouTube", () => {
    expect(validatePublish({ ...base, platform: "tiktok", capability: cap("tiktok") })[0]).toMatch(/needs a video/);
    expect(validatePublish({ ...base, platform: "youtube", capability: cap("youtube"), title: "T" })[0]).toMatch(/needs a video/);
  });
  it("rejects images on video-only platforms", () => {
    expect(validatePublish({ ...base, platform: "tiktok", capability: cap("tiktok"), mediaKind: "image", mediaReady: true })[0]).toMatch(/can't publish images/);
  });
  it("uses the backend's caption limit for X", () => {
    const problems = validatePublish({ ...base, platform: "x", capability: cap("x"), caption: "a".repeat(300) });
    expect(problems[0]).toMatch(/20 characters over/);
    expect(validatePublish({ ...base, platform: "x", capability: { ...cap("x"), maxCaptionLength: 500 }, caption: "a".repeat(300) })).toEqual([]);
  });
  it("requires a title for YouTube", () => {
    expect(validatePublish({ ...base, platform: "youtube", capability: cap("youtube"), mediaKind: "video", mediaReady: true }).join()).toMatch(/needs a title/);
  });
  it("enforces Shorts length from capabilities", () => {
    const p = validatePublish({ ...base, platform: "youtube", capability: cap("youtube"), title: "T", mediaKind: "video", mediaReady: true, videoSeconds: 75 });
    expect(p.join()).toMatch(/allows up to 60s/);
  });
  it("asks to render before posting", () => {
    expect(validatePublish({ ...base, platform: "facebook", capability: cap("facebook"), mediaKind: "image", mediaReady: false })[0]).toMatch(/Render the visual/);
  });
  it("derives media kind from the content", () => {
    expect(mediaKindOf({ structured: { reel: {} as never }, visual: null })).toBe("video");
    expect(mediaKindOf({ structured: { carousel: {} as never }, visual: null })).toBe("carousel");
    expect(mediaKindOf({ structured: null, visual: null })).toBe("none");
  });
});

describe("bulk post planning", () => {
  const caps = new Map(CAPABILITIES.map((c) => [c.platform, c as unknown as SocialCapability]));
  const item = (over: Partial<ContentItem>) =>
    ({ id: "c1", type: "SOCIAL_POST", title: "T", body: "Hello", status: "DRAFT", sermonId: "s", sermonTitle: "S", currentVersion: 1, updatedAt: "", source: "AI_GENERATED", ...over }) as ContentItem;

  it("only plans social posts and quotes that haven't gone out", () => {
    const plan = planBulkPost([item({}), item({ id: "q", type: "QUOTE" }), item({ id: "d", type: "DEVOTIONAL" }), item({ id: "p", status: "PUBLISHED" })], ["facebook"], caps);
    expect(plan.map((e) => e.item.id)).toEqual(["c1", "q"]);
  });
  it("skips platforms that need media the item doesn't have, without dropping the rest", () => {
    const [entry] = planBulkPost([item({})], ["facebook", "instagram"], caps);
    expect(entry.targets).toEqual(["facebook"]);
    expect(entry.skipped[0].platform).toBe("instagram");
  });
  it("skips X when the caption is over its limit instead of truncating", () => {
    const [entry] = planBulkPost([item({ body: "a".repeat(300) })], ["x", "facebook"], caps);
    expect(entry.targets).toEqual(["facebook"]);
  });
  it("wraps quotes in curly quotes", () => {
    expect(defaultCaption(item({ type: "QUOTE", body: "Walk by faith" }))).toBe("“Walk by faith”");
  });
});
