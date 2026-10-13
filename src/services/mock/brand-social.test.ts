import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleMock } from "./handler";
import type { BrandProfile, ContentItem, ContentTemplate, SocialConnection, SocialPost } from "@/types";

const get = <T,>(path: string) => handleMock("GET", path) as Promise<T>;
const post = <T,>(path: string, body?: unknown) => handleMock("POST", path, body) as Promise<T>;
const put = <T,>(path: string, body?: unknown) => handleMock("PUT", path, body) as Promise<T>;
const login = () => post("/auth/login", { email: "demo@abydesermon.app", password: "demo1234", remember: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("brand studio contract", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    await login();
  });

  it("returns a brand profile derived from the church, with voice defaults", async () => {
    const b = await get<BrandProfile>("/brand-studio");
    expect(b.churchName).toBe("Grace Community Church");
    expect(b.primaryColor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(b.voice.emojiUsage).toBe("occasionally");
    expect(b.assets).toEqual([]);
  });

  it("uploads an asset through presign and resolves the logo URL on save", async () => {
    const p = await post<{ assetId: string; method: string }>("/brand-studio/assets/presign", { fileName: "logo.png", contentType: "image/png", sizeBytes: 10, kind: "LOGO" });
    expect(p.method).toBe("PUT");
    const before = await get<BrandProfile>("/brand-studio");
    expect(before.assets).toHaveLength(1);
    const saved = await put<BrandProfile>("/brand-studio", { ...before, logoAssetId: p.assetId, headingFont: "Lora" });
    expect(saved.headingFont).toBe("Lora");
    expect(saved.logoUrl).toBe(before.assets[0].url);
    await handleMock("DELETE", `/brand-studio/assets/${p.assetId}`);
    expect((await get<BrandProfile>("/brand-studio")).logoAssetId).toBeNull();
  });

  it("lists templates per category and switches defaults, rejecting mismatches", async () => {
    const tpls = await get<ContentTemplate[]>("/brand-studio/templates");
    const quotes = tpls.filter((t) => t.category === "SERMON_QUOTE");
    expect(quotes).toHaveLength(3);
    expect(quotes.filter((t) => t.isDefault)).toHaveLength(1);
    const next = quotes.find((t) => !t.isDefault)!;
    const updated = await put<ContentTemplate[]>("/brand-studio/templates/SERMON_QUOTE/default", { templateId: next.id });
    expect(updated.find((t) => t.id === next.id)?.isDefault).toBe(true);
    await expect(put("/brand-studio/templates/SCRIPTURE/default", { templateId: next.id })).rejects.toMatchObject({ status: 422 });
  });

  it("renders a visual: RENDERING first, READY with assets later", async () => {
    const c = await post<ContentItem>("/content/c-dev-5/render", { format: "instagram-square" });
    expect(c.visual?.status).toBe("RENDERING");
    await sleep(2100);
    const done = await get<ContentItem>("/content/c-dev-5");
    expect(done.visual?.status).toBe("READY");
    expect(done.visual?.assets[0]).toMatchObject({ width: 1080, height: 1080 });
  });

  it("renders one asset per carousel slide", async () => {
    const list = await get<{ data: ContentItem[] }>("/content?type=SOCIAL_POST&sermonId=sermon-1&pageSize=50");
    const carousel = list.data.find((c) => c.structured?.carousel);
    expect(carousel).toBeTruthy();
    await post(`/content/${carousel!.id}/render`, { format: "carousel-slide" });
    await sleep(2100);
    const done = await get<ContentItem>(`/content/${carousel!.id}`);
    expect(done.visual?.assets).toHaveLength(carousel!.structured!.carousel!.slides.length);
  }, 10_000);

  it("persists structured reel edits through PATCH /content", async () => {
    const list = await get<{ data: ContentItem[] }>("/content?type=VIDEO_IDEA&pageSize=1");
    const reel = list.data[0].structured!.reel!;
    const updated = await handleMock("PATCH", `/content/${list.data[0].id}`, { structured: { reel: { ...reel, hook: "New hook" } } }) as ContentItem;
    expect(updated.structured?.reel?.hook).toBe("New hook");
  });
});

describe("social publishing contract", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    await login();
  });

  it("exposes connections and backend capabilities", async () => {
    const conns = await get<SocialConnection[]>("/social/connections");
    expect(conns.map((c) => [c.platform, c.status])).toContainEqual(["tiktok", "expired"]);
    const caps = await get<{ platform: string; maxCaptionLength: number }[]>("/social/capabilities");
    expect(caps.find((c) => c.platform === "x")?.maxCaptionLength).toBe(280);
  });

  it("refuses to post to an expired connection", async () => {
    await expect(post("/social/posts", { contentId: "c-dev-5", caption: "Hi", mediaAssetIds: [], targets: [{ platform: "tiktok", connectionId: "conn-tt" }] })).rejects.toMatchObject({ code: "CONNECTION_INVALID" });
  });

  it("creates a post, publishes it, and reports per-platform results over time", async () => {
    const created = await post<SocialPost>("/social/posts", { contentId: "c-dev-5", caption: "Hi", mediaAssetIds: ["m1"], targets: [{ platform: "facebook", connectionId: "conn-fb" }, { platform: "instagram", connectionId: "conn-ig" }] });
    expect(created.status).toBe("READY");
    const started = await post<SocialPost>(`/social/posts/${created.id}/publish`);
    expect(["QUEUED", "PUBLISHING"]).toContain(started.status);
    await sleep(2300);
    const done = await get<SocialPost>(`/social/posts/${created.id}`);
    expect(done.status).toBe("PUBLISHED");
    expect(done.results.every((r) => r.status === "PUBLISHED")).toBe(true);
    expect(done.canRetry).toBe(false);
  }, 10_000);

  it("seed has a partially published post that can be retried, and reconnecting fixes it", async () => {
    const p1 = await get<SocialPost>("/social/posts/post-1");
    expect(p1.status).toBe("PARTIALLY_PUBLISHED");
    expect(p1.canRetry).toBe(true);
    expect(p1.results.find((r) => r.platform === "tiktok")).toMatchObject({ status: "FAILED" });
    await expect(post("/social/posts/post-2/retry")).rejects.toMatchObject({ status: 409 });
    await post("/social/connections/conn-tt/reconnect");
    await post("/social/posts/post-1/retry");
    await sleep(2300);
    expect((await get<SocialPost>("/social/posts/post-1")).status).toBe("PUBLISHED");
  }, 10_000);

  it("schedules in the future only", async () => {
    await expect(post("/social/posts/post-2/schedule", { scheduledAt: "2020-01-01T00:00:00Z" })).rejects.toMatchObject({ status: 422 });
    const ok = await post<SocialPost>("/social/posts/post-2/schedule", { scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(ok.status).toBe("SCHEDULED");
  });

  it("filters posts by content and date range", async () => {
    const res = await get<{ data: SocialPost[]; meta: { total: number } }>("/social/posts?contentId=c-dev-1");
    expect(res.data.every((p) => p.contentId === "c-dev-1")).toBe(true);
    expect(res.meta.total).toBe(1);
  });

  it("connect (authorize) marks a provider connected", async () => {
    const res = await get<{ authorizationUrl: string }>("/social/connections/youtube/authorize");
    expect(res.authorizationUrl).toContain("connected=youtube");
    expect((await get<SocialConnection[]>("/social/connections")).some((c) => c.platform === "youtube" && c.status === "connected")).toBe(true);
  });
});
