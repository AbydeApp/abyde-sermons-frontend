import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api-client";
import { handleMock } from "./handler";
import { DEMO_OTP } from "./seed";

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

  describe("email verification", () => {
    const signup = async (extra: Record<string, unknown> = {}) => {
      const email = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}@x.org`;
      const res = await post<{ email: string }>("/auth/register", { fullName: "Test User", email, password: "abcd1234", ...extra });
      return { email, res };
    };

    it("registers with just name, email and password, and does not sign in yet", async () => {
      const { email, res } = await signup();
      expect(res).toEqual({ email });
      expect((await get<{ authenticated: boolean }>("/auth/me")).authenticated).toBe(false);
    });

    it("blocks login until the email is verified, then signs in with the right code", async () => {
      const { email } = await signup({ churchName: "Test Church" });
      await expect(post("/auth/login", { email, password: "abcd1234" })).rejects.toMatchObject({ status: 403, code: "EMAIL_NOT_VERIFIED" });
      await expect(post("/auth/verify-email", { email, code: "000000" })).rejects.toMatchObject({ status: 422, code: "OTP_INVALID" });
      const me = await post<{ authenticated: boolean; church: { name: string } }>("/auth/verify-email", { email, code: DEMO_OTP });
      expect(me.authenticated).toBe(true);
      expect(me.church.name).toBe("Test Church");
      await expect(post("/church", { name: "Second", ownerRole: "Pastor" })).rejects.toMatchObject({ status: 409 });
    });

    it("defaults the church name when none is given", async () => {
      const { email } = await signup();
      const me = await post<{ church: { name: string } }>("/auth/verify-email", { email, code: DEMO_OTP });
      expect(me.church.name).toBe("Your Ministry");
    });

    it("locks the code after too many wrong attempts until a new one is sent", async () => {
      const { email } = await signup();
      for (let i = 0; i < 5; i++) await expect(post("/auth/verify-email", { email, code: "111111" })).rejects.toMatchObject({ code: "OTP_INVALID" });
      await expect(post("/auth/verify-email", { email, code: DEMO_OTP })).rejects.toMatchObject({ status: 429, code: "OTP_LOCKED" });
      await post("/auth/resend-verification", { email });
      expect((await post<{ authenticated: boolean }>("/auth/verify-email", { email, code: DEMO_OTP })).authenticated).toBe(true);
    });

    it("rejects an expired code", async () => {
      // Fake only the clock; the mock still needs real timers for its simulated latency.
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        const { email } = await signup();
        vi.setSystemTime(Date.now() + 11 * 60_000);
        await expect(post("/auth/verify-email", { email, code: DEMO_OTP })).rejects.toMatchObject({ code: "OTP_EXPIRED" });
      } finally {
        vi.useRealTimers();
      }
    });

    it("answers resend the same for unknown emails", async () => {
      await expect(post("/auth/resend-verification", { email: "nobody@x.org" })).resolves.toBeUndefined();
    });

    it("rejects a duplicate email", async () => {
      const { email } = await signup();
      await expect(post("/auth/register", { fullName: "Again", email, password: "abcd1234" })).rejects.toMatchObject({ status: 409, code: "EMAIL_TAKEN" });
    });
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
