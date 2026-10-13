import { afterEach, expect, it, vi } from "vitest";
import type { ContentItem } from "@/types";
import { contentService } from "@/services/content.service";
import { groupContent } from "./group-content";

const item = (id: string, sermonId: string, type: ContentItem["type"]): ContentItem => ({
  id, sermonId, type, sermonTitle: "Living faith", title: id, body: "Draft",
  status: "DRAFT", currentVersion: 1, updatedAt: "2026-10-13T10:00:00Z", source: { sermonId, sermonTitle: "Living faith", segments: [], scriptures: [], verbatim: false },
});
afterEach(() => vi.restoreAllMocks());

it("keeps matching sermon/type items together and separates sermons with identical titles", () => {
  const first = item("social-1", "sermon-1", "SOCIAL_POST");
  const last = item("social-2", "sermon-1", "SOCIAL_POST");
  const groups = groupContent([first, item("prayer", "sermon-1", "PRAYER"), item("other", "sermon-2", "SOCIAL_POST"), last]);
  expect(groups).toHaveLength(3);
  expect(groups[0].items).toEqual([first, last]);
  expect(groups[2].id).not.toBe(groups[0].id);
});

it("loads all filtered pages before grouping so one group isn't split by API pagination", async () => {
  const first = item("social-1", "sermon-1", "SOCIAL_POST");
  const last = item("social-2", "sermon-1", "SOCIAL_POST");
  const list = vi.spyOn(contentService, "list")
    .mockResolvedValueOnce({ items: [first], total: 2, page: 1, pageSize: 1 })
    .mockResolvedValueOnce({ items: [last], total: 2, page: 2, pageSize: 1 });
  const signal = new AbortController().signal;
  const result = await contentService.listAll({ sermonId: "sermon-1", status: "DRAFT", channel: "x" }, signal);
  expect(groupContent(result.items)[0].items).toHaveLength(2);
  expect(list).toHaveBeenNthCalledWith(2, { sermonId: "sermon-1", status: "DRAFT", channel: "x", page: 2, pageSize: 1 }, signal);
});
