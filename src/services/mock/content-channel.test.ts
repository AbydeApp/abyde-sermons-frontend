import { beforeEach, expect, it } from "vitest";
import { handleMock } from "./handler";
import type { ContentItem } from "@/types";

const list = (query: string) => handleMock("GET", `/content?${query}`) as Promise<{ data: ContentItem[]; meta: { total: number } }>;

beforeEach(async () => {
  localStorage.clear();
  await handleMock("POST", "/auth/login", { email: "demo@abydesermon.app", password: "demo1234", remember: true });
});

it("filters channel targets before pagination and combines with content filters", async () => {
  const facebook = await list("channel=facebook&pageSize=50");
  expect(facebook.data.map((item) => item.id).sort()).toEqual(["c-dev-1", "c-soc-1"]);
  const instagram = await list("channel=instagram&pageSize=50");
  expect(instagram.data.map((item) => item.id)).toEqual(["c-dev-1"]);
  const social = await list("channel=facebook&type=SOCIAL_POST&pageSize=1");
  expect(social.data.map((item) => item.id)).toEqual(["c-soc-1"]);
  expect((await list("channel=x")).data).toEqual([]);
  expect((await list("pageSize=50")).data.length).toBeGreaterThan(facebook.data.length);
});
