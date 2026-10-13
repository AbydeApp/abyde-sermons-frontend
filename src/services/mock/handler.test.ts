import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api-client";
import { handleMock } from "./handler";

const get = <T,>(path: string) => handleMock("GET", path) as Promise<T>;
const post = <T,>(path: string, body?: unknown) => handleMock("POST", path, body) as Promise<T>;
const login = () => post("/auth/login", { email: "demo@abydesermon.app", password: "demo1234", remember: true });

describe("mock backend follows the backend contract", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("GET /auth/me answers 200 when signed out", async () => {
    const me = await get<{ authenticated: boolean; church: unknown }>("/auth/me");
    expect(me.authenticated).toBe(false);
    expect(me.church).toBeNull();
  });

  it("rejects unauthenticated data requests", async () => {
    await expect(get("/dashboard")).rejects.toMatchObject({ status: 401 });
  });

  it("registers required phone and optional ministry details", async () => {
    const reg = await post<{
      onboardingCompleted: boolean;
      user: { phoneNumber: string };
      church: { name: string; denomination: string; address: string; primaryColor: string; secondaryColor: string; accentColor: string };
    }>("/auth/register", {
      fullName: "Test User",
      email: `t${Date.now()}@x.org`,
      password: "abcd1234",
      phoneNumber: "+234 801 234 5678",
      churchName: "Test Church",
      denomination: "Baptist",
      churchAddress: "1 Test Road",
      primaryColor: "#123456",
      secondaryColor: "#234567",
      accentColor: "#345678",
    });
    expect(reg.onboardingCompleted).toBe(true);
    expect(reg.user.phoneNumber).toBe("+234 801 234 5678");
    expect(reg.church).toMatchObject({
      name: "Test Church",
      denomination: "Baptist",
      address: "1 Test Road",
      primaryColor: "#123456",
      secondaryColor: "#234567",
      accentColor: "#345678",
    });
    expect(await get<{ primaryColor: string; secondaryColor: string; accentColor: string }>("/brand-studio")).toMatchObject({
      primaryColor: "#123456",
      secondaryColor: "#234567",
      accentColor: "#345678",
    });
    await expect(post("/church", { name: "Second", ownerRole: "Pastor" })).rejects.toMatchObject({ status: 409 });
  });

  it("registers without optional church details", async () => {
    const reg = await post<{ onboardingCompleted: boolean; church: { name: string; denomination: string | null } }>("/auth/register", {
      fullName: "Test User",
      email: `t${Date.now()}@x.org`,
      password: "abcd1234",
      phoneNumber: "08012345678",
    });
    expect(reg.onboardingCompleted).toBe(true);
    expect(reg.church).toMatchObject({ name: "Your Ministry", denomination: null });
  });

  it("rejects registration without a valid phone number", async () => {
    await expect(post("/auth/register", {
      fullName: "Test User",
      email: `t${Date.now()}@x.org`,
      password: "abcd1234",
    })).rejects.toMatchObject({ status: 422, fields: { phoneNumber: "Enter a valid phone number" } });
  });

  it("rejects wrong password with INVALID_CREDENTIALS", async () => {
    await expect(post("/auth/login", { email: "demo@abydesermon.app", password: "nope" })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("lists in the {data, meta} envelope", async () => {
    await login();
    const res = await get<{ data: unknown[]; meta: { total: number; totalPages: number } }>("/sermons?pageSize=2");
    expect(res.data).toHaveLength(2);
    expect(res.meta.total).toBeGreaterThan(2);
    expect(res.meta.totalPages).toBeGreaterThan(1);
  });

  it("approves, schedules through the calendar, and rejects past dates", async () => {
    await login();
    const draft = (await get<{ data: { id: string }[] }>("/content?status=DRAFT")).data[0];
    await expect(post("/calendar", { contentItemId: draft.id, scheduledAt: new Date(Date.now() + 86_400_000).toISOString() })).rejects.toMatchObject({ code: "CONTENT_NOT_APPROVED" });
    await post(`/content/${draft.id}/approve`);
    await expect(post("/calendar", { contentItemId: draft.id, scheduledAt: "2020-01-01T00:00:00Z" })).rejects.toMatchObject({ status: 422, fields: { scheduledAt: expect.any(String) } });
    const item = await post<{ id: string; content: { status: string } }>("/calendar", { contentItemId: draft.id, scheduledAt: new Date(Date.now() + 86_400_000).toISOString() });
    expect(item.content.status).toBe("SCHEDULED");
    const removed = await handleMock("DELETE", `/calendar/${item.id}`);
    expect(removed).toBeUndefined();
    expect((await get<{ status: string }>(`/content/${draft.id}`)).status).toBe("APPROVED");
  });

  it("keeps version history and restores without deleting history", async () => {
    await login();
    const id = "c-dev-5";
    const original = await get<{ body: string; currentVersion: number }>(`/content/${id}`);
    await handleMock("PATCH", `/content/${id}`, { body: "My edit" });
    const rewritten = await post<{ body: string; currentVersion: number }>(`/content/${id}/rewrite`, { action: "EXPAND" });
    expect(rewritten.currentVersion).toBe(original.currentVersion + 2);
    const restored = await post<{ body: string; currentVersion: number }>(`/content/${id}/versions/1/restore`);
    expect(restored.body).toBe(original.body);
    const versions = await get<{ version: number; source: string }[]>(`/content/${id}/versions`);
    expect(versions.map((v) => v.version)).toEqual([4, 3, 2, 1]);
    expect(versions.map((v) => v.source)).toEqual(["USER_EDIT", "AI_REWRITE", "USER_EDIT", "AI_GENERATED"]);
  });

  it("blocks edits to published content", async () => {
    await login();
    await expect(handleMock("PATCH", "/content/c-dev-1", { title: "x" })).rejects.toMatchObject({ code: "CONTENT_LOCKED" });
  });

  it("deletes content and sermons", async () => {
    await login();
    await handleMock("DELETE", "/content/c-dev-6");
    await expect(get("/content/c-dev-6")).rejects.toMatchObject({ status: 404 });
    await handleMock("DELETE", "/sermons/sermon-4");
    await expect(get("/sermons/sermon-4")).rejects.toBeInstanceOf(ApiError);
  });

  it("failed sermons expose the failed stage and a retry", async () => {
    await login();
    const st = await get<{ status: string; failedStage: string; canRetry: boolean }>("/sermons/sermon-5/status");
    expect(st).toMatchObject({ status: "FAILED", failedStage: "TRANSCRIBE", canRetry: true });
    const retried = await post<{ status: string }>("/sermons/sermon-5/status/retry");
    expect(retried.status).not.toBe("FAILED");
  });

  it("uses the presigned upload flow and accepts pasted transcripts", async () => {
    await login();
    const p = await post<{ uploadUrl: string; objectKey: string; method: string }>("/uploads/presign", { fileName: "a.mp3", contentType: "audio/mpeg", sizeBytes: 10, purpose: "SERMON_MEDIA" });
    expect(p.method).toBe("PUT");
    const a = await post<{ id: string }>("/sermons", { title: "T", speaker: "S", sermonDate: new Date().toISOString(), objectKey: p.objectKey });
    const b = await post<{ id: string }>("/sermons", { title: "T2", speaker: "S", sermonDate: new Date().toISOString(), transcriptText: "words" });
    expect(a.id).not.toBe(b.id);
    await expect(post("/sermons", { title: "T3", speaker: "S", sermonDate: new Date().toISOString() })).rejects.toMatchObject({ status: 422 });
  });

  it("semantic search returns the sermons envelope and Ask cites sources in ms", async () => {
    await login();
    const res = await post<{ data: { title: string }[] }>("/library/semantic-search", { query: "dealing with fear" });
    expect(res.data.some((s) => s.title === "Peace in the Storm")).toBe(true);
    const ans = await post<{ sources: { startTimeMs: number }[] }>("/ask", { question: "What have we said about fear?" });
    expect(ans.sources[0].startTimeMs).toBeGreaterThanOrEqual(0);
  });
});
