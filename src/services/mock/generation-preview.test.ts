import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handleMock } from "./handler";
import type { ContentItem, GenerationGroup } from "@/types";

beforeEach(async () => {
  localStorage.clear();
  await handleMock("POST", "/auth/login", { email: "demo@abydesermon.app", password: "demo1234", remember: true });
});
afterEach(() => vi.restoreAllMocks());

it("previews only the new generation and persists its drafts across requests", async () => {
  const group = await handleMock("POST", "/sermons/sermon-1/generate-week", { contentTypes: ["DEVOTIONAL", "PRAYER"] }) as GenerationGroup;
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 10_000);
  const done = await handleMock("GET", `/sermons/sermon-1/generations/${group.id}`) as GenerationGroup;
  expect(done.done).toBe(true);
  const path = `/content?sermonId=sermon-1&generationId=${group.id}&pageSize=50`;
  const preview = await handleMock("GET", path) as { data: ContentItem[] };
  expect(preview.data).toHaveLength(8);
  expect(preview.data.every((item) => item.status === "DRAFT")).toBe(true);
  expect(preview.data.some((item) => item.id === "c-dev-1")).toBe(false);
  await handleMock("GET", `/sermons/sermon-1/generations/${group.id}`);
  const again = await handleMock("GET", path) as { data: ContentItem[] };
  expect(again.data.map((item) => item.id)).toEqual(preview.data.map((item) => item.id));
});
