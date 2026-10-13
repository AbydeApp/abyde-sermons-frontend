import { addDays, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import { ApiError } from "../api-client";
import { buildPoster, placeholderAsset, toDataUrl } from "./svg";
import {
  CAPABILITIES,
  DEFAULT_INTEGRATIONS,
  TEMPLATES,
  defaultBrand,
  firstVersion,
  intelligenceFor,
  makeContent,
  seedDb,
  transcriptFor,
  type MockDb,
  type MockPost,
  type MockSermon,
} from "./seed";
import { FORMATS } from "@/constants/brand";
import type {
  AnalyticsSummary,
  BrandProfile,
  CalendarItem,
  ContentTemplate,
  PlatformResult,
  SocialPost,
  SocialPostStatus,
  TemplateCategory,
  VisualFormat,
  Church,
  ContentItem,
  ContentType,
  ContentVersion,
  GenerationGroup,
  MeResponse,
  ProcessingStage,
  SermonStatus,
} from "@/types";

const KEY = "abyde-sermon:mock-db:v3";
const STEP_MS = 2400;
const STAGES: ProcessingStage[] = ["UPLOAD", "MEDIA", "TRANSCRIBE", "UNDERSTAND", "SCRIPTURES", "INTELLIGENCE", "INDEX"];
const STATUS_FOR_STAGE: Record<ProcessingStage, SermonStatus> = {
  UPLOAD: "UPLOADED",
  MEDIA: "QUEUED",
  TRANSCRIBE: "TRANSCRIBING",
  UNDERSTAND: "ANALYZING",
  SCRIPTURES: "ANALYZING",
  INTELLIGENCE: "ANALYZING",
  INDEX: "INDEXING",
};

let memory: MockDb | null = null;

function load(): MockDb {
  if (memory) return memory;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) return (memory = JSON.parse(raw) as MockDb);
  } catch {
    /* fall through to a fresh seed */
  }
  return (memory = seedDb());
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 200));
const nextId = (db: MockDb, p: string) => `${p}-${++db.counter}`;
const nowIso = () => new Date().toISOString();

function fail(status: number, code: string, message: string, errors?: Record<string, string[]>): never {
  throw new ApiError(status, code, message, errors ? Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v[0]])) : undefined);
}

function currentUser(db: MockDb) {
  const u = db.users.find((x) => x.id === db.sessionUserId);
  if (!u) fail(401, "UNAUTHORIZED", "Please sign in.");
  return u;
}

function meOf(db: MockDb, userId: string | null): MeResponse {
  const u = db.users.find((x) => x.id === userId);
  if (!u) return { authenticated: false, user: null, onboardingCompleted: false, church: null };
  return {
    authenticated: true,
    user: { id: u.id, fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber ?? null },
    onboardingCompleted: u.onboardingCompleted,
    church: db.churches[u.id] ?? null,
  };
}

function page<T>(all: T[], q: URLSearchParams | { page?: number; pageSize?: number }, defaultSize = 10) {
  const get = (k: "page" | "pageSize") => (q instanceof URLSearchParams ? Number(q.get(k)) || undefined : q[k]);
  const p = Math.max(1, get("page") ?? 1);
  const size = Math.min(100, Math.max(1, get("pageSize") ?? defaultSize));
  return { data: all.slice((p - 1) * size, p * size), meta: { page: p, pageSize: size, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / size)) } };
}

function refreshSermon(s: MockSermon): MockSermon {
  if (s.failAt) {
    s.status = "FAILED";
    s.processingStage = null;
    return s;
  }
  if (s.processingStartedAt && s.status !== "READY") {
    const idx = Math.floor((Date.now() - s.processingStartedAt) / STEP_MS);
    if (idx >= STAGES.length) {
      s.status = "READY";
      s.processingStage = null;
      save();
    } else {
      s.processingStage = STAGES[idx];
      s.status = STATUS_FOR_STAGE[STAGES[idx]];
    }
  }
  return s;
}

function sermonsOf(db: MockDb) {
  return db.sermons[currentUser(db).id].map(refreshSermon);
}

function findSermon(db: MockDb, id: string) {
  const s = sermonsOf(db).find((x) => x.id === id);
  if (!s) fail(404, "NOT_FOUND", "Sermon not found.");
  return s;
}

function statusInfo(s: MockSermon) {
  return {
    sermonId: s.id,
    status: s.status,
    processingStage: s.processingStage,
    failedStage: s.failAt ?? null,
    errorMessage: s.failAt ? "We couldn't transcribe this audio. The file may be corrupted or silent." : null,
    canRetry: s.status === "FAILED",
  };
}

function publicSermon(s: MockSermon) {
  const { processingStartedAt: _a, failAt: _b, ...rest } = s;
  void _a;
  void _b;
  return rest;
}

function contentOf(db: MockDb) {
  return db.content[currentUser(db).id];
}

function findContent(db: MockDb, id: string): ContentItem {
  const c = contentOf(db).find((x) => x.id === id);
  if (!c) fail(404, "NOT_FOUND", "Content not found.");
  return refreshVisual(db, c);
}

function brandOf(db: MockDb): BrandProfile {
  const uid = currentUser(db).id;
  const b = (db.brand[uid] ??= defaultBrand(db.churches[uid], db.churches[uid]?.id ?? uid));
  const asset = (id?: string | null) => b.assets.find((a) => a.id === id)?.url ?? null;
  b.logoUrl = asset(b.logoAssetId);
  b.alternateLogoUrl = asset(b.alternateLogoAssetId);
  return b;
}

function templatesOf(db: MockDb): ContentTemplate[] {
  const defaults = (db.templateDefaults[currentUser(db).id] ??= {});
  return TEMPLATES.map((t) => ({ ...t, isDefault: defaults[t.category] ? defaults[t.category] === t.id : t.id.endsWith("-1") }));
}

/** Turns a finished simulated render into downloadable assets. */
function refreshVisual(db: MockDb, c: ContentItem): ContentItem {
  const r = db.renders[c.id];
  if (c.visual?.status !== "RENDERING" || !r) return c;
  const isReel = !!c.structured?.reel;
  if (Date.now() - r.startedAt < (isReel ? 4000 : 2000)) return c;
  const brand = brandOf(db);
  const fmt = FORMATS[(r.format as VisualFormat) ?? "instagram-portrait"];
  const tpl = TEMPLATES.find((t) => t.id === r.templateId) ?? TEMPLATES[0];
  const common = { width: fmt.width, height: fmt.height, variant: tpl.variant, primary: brand.primaryColor, secondary: brand.secondaryColor, accent: brand.accentColor, headingFont: brand.headingFont, bodyFont: brand.bodyFont, footer: brand.footerText ?? brand.socialHandle ?? undefined };
  const poster = (headline: string, body?: string) => toDataUrl(buildPoster({ ...common, headline, body }));
  const slides = c.structured?.carousel?.slides;
  const assets = slides
    ? slides.map((sl, i) => ({ id: `${c.id}-s${i + 1}`, url: poster(sl.title || sl.body, sl.title ? sl.body : undefined), width: fmt.width, height: fmt.height, kind: "image" as const }))
    : [
        {
          id: `${c.id}-r${r.startedAt}`,
          url: poster(r.overrides?.headline ?? (c.type === "QUOTE" ? c.body : c.title), r.overrides?.body ?? (c.type === "QUOTE" ? undefined : c.body)),
          width: fmt.width,
          height: fmt.height,
          kind: (isReel ? "video" : "image") as "image" | "video",
        },
      ];
  c.visual = { status: "READY", assets, thumbnailUrl: assets[0].url, errorMessage: null };
  delete db.renders[c.id];
  save();
  return c;
}

const SOCIAL_STEP = { queued: 800, publishing: 2200 };

/** Derives a post's live status and per-platform results from its stored state. */
function postDto(db: MockDb, uid: string, p: MockPost): SocialPost {
  const content = db.content[uid].find((c) => c.id === p.contentId);
  const conns = db.connections[uid] ?? [];
  let status: SocialPostStatus = p.mediaAssetIds.length ? "READY" : "DRAFT";
  let results: PlatformResult[] = [];
  if (p.publishAt) {
    const elapsed = Date.now() - p.publishAt;
    if (elapsed < SOCIAL_STEP.queued) status = "QUEUED";
    else if (elapsed < SOCIAL_STEP.publishing) status = "PUBLISHING";
    else {
      if (!p.results) {
        p.results = p.targets.map((t) => {
          const kept = p.keep?.find((r) => r.platform === t.platform);
          if (kept) return kept;
          const conn = conns.find((c) => c.id === t.connectionId);
          return conn && conn.status === "connected"
            ? { platform: t.platform, status: "PUBLISHED" as const, message: null, externalUrl: `https://example.com/${t.platform}/${p.id}` }
            : { platform: t.platform, status: "FAILED" as const, message: "Authorization expired — reconnect this account.", externalUrl: null };
        });
        p.keep = undefined;
        save();
      }
      results = p.results;
      const ok = results.filter((r) => r.status === "PUBLISHED").length;
      status = ok === results.length ? "PUBLISHED" : ok === 0 ? "FAILED" : "PARTIALLY_PUBLISHED";
    }
  } else if (p.scheduledAt) status = "SCHEDULED";
  else if (content?.visual?.status === "RENDERING") status = "RENDERING";
  return {
    id: p.id,
    contentId: p.contentId,
    contentType: content?.type ?? "SOCIAL_POST",
    title: p.title,
    caption: p.caption,
    mediaAssetIds: p.mediaAssetIds,
    thumbnailUrl: content?.visual?.thumbnailUrl ?? null,
    targets: p.targets,
    scheduledAt: p.scheduledAt,
    status,
    results,
    canRetry: results.some((r) => r.status === "FAILED"),
    createdAt: p.createdAt,
  };
}

function findPost(db: MockDb, id: string): MockPost {
  const p = (db.posts[currentUser(db).id] ?? []).find((x) => x.id === id);
  if (!p) fail(404, "NOT_FOUND", "Post not found.");
  return p;
}

function pushVersion(db: MockDb, c: ContentItem, source: ContentVersion["source"], title = c.title, body = c.body) {
  const list = (db.versions[c.id] ??= [firstVersion(c)]);
  const version = c.currentVersion + 1;
  list.push({ version, title, body, source, aiProvider: source === "USER_EDIT" ? null : "mock", aiModel: source === "USER_EDIT" ? null : "mock-1", createdAt: nowIso() });
  c.currentVersion = version;
  c.title = title;
  c.body = body;
  c.updatedAt = nowIso();
}

function assertEditable(c: ContentItem) {
  if (c.status === "PUBLISHED" || c.status === "ARCHIVED") fail(422, "CONTENT_LOCKED", "Published content can't be edited.");
}

/** Editing approved/scheduled content returns it to DRAFT and removes its calendar item. */
function demoteToDraft(c: ContentItem) {
  if (c.status === "APPROVED" || c.status === "SCHEDULED" || c.status === "FAILED") {
    c.status = "DRAFT";
    c.scheduledAt = null;
    c.calendarItemId = null;
  }
}

function groupOf(db: MockDb, groupId: string): GenerationGroup {
  const uid = currentUser(db).id;
  const g = db.groups.find((x) => x.id === groupId);
  if (!g) fail(404, "NOT_FOUND", "Generation not found.");
  const elapsed = Date.now() - g.startedAt;
  const jobs = g.types.map((t, i) => {
    const doneAt = 1600 + i * 900;
    const status = (elapsed >= doneAt ? "COMPLETED" : elapsed >= i * 900 ? "PROCESSING" : "QUEUED") as GenerationGroup["jobs"][number]["status"];
    return { contentType: t, status, errorMessage: null };
  });
  const done = jobs.every((j) => j.status === "COMPLETED" || j.status === "FAILED");
  if (done && !g.materialized) {
    g.materialized = true;
    g.contentIds = [];
    const sermon = db.sermons[uid].find((s) => s.id === g.sermonId)!;
    const counts: Partial<Record<ContentType, number>> = { DEVOTIONAL: 7, SOCIAL_POST: 7, WHATSAPP: 3, QUOTE: 3 };
    const list = db.content[uid];
    for (const t of g.types) {
      for (let n = 1; n <= (counts[t] ?? 1); n++) {
        const c = makeContent(nextId(db, "c"), sermon, t, n);
        list.push(c);
        g.contentIds.push(c.id);
        db.versions[c.id] = [firstVersion(c)];
      }
    }
    sermon.contentCount = list.filter((c) => c.sermonId === sermon.id).length;
    save();
  }
  return { id: g.id, sermonId: g.sermonId, jobs, done };
}

function rewrite(body: string, action: string): string {
  switch (action) {
    case "SHORTEN":
      return body.split("\n\n").slice(0, 2).join("\n\n");
    case "EXPAND":
      return `${body}\n\nTake a moment today to sit with this. Ask God where he is inviting you to trust him more deeply, and write down one thing you sense.`;
    case "WARMER":
      return `Friend, ${body.charAt(0).toLowerCase()}${body.slice(1)}`;
    case "CONVERSATIONAL":
      return body.replace(/\bdo not\b/g, "don't").replace(/\bcannot\b/g, "can't");
    case "ALTERNATIVE":
      return `Here's another way to see it.\n\n${body}`;
    default:
      return `${body}\n\n(Regenerated)`;
  }
}

function calendarItem(c: ContentItem): CalendarItem {
  return {
    id: c.calendarItemId!,
    contentItemId: c.id,
    scheduledAt: c.scheduledAt!,
    status: c.status,
    content: { id: c.id, type: c.type, title: c.title, status: c.status, sermonId: c.sermonId, sermonTitle: c.sermonTitle },
  };
}

function librarySearch(db: MockDb, body: Record<string, unknown>, term?: string) {
  const f = (k: string) => (typeof body[k] === "string" && body[k] ? (body[k] as string) : undefined);
  const words = term?.toLowerCase().split(/\W+/).filter((w) => w.length > 3) ?? [];
  const all = sermonsOf(db)
    .filter((s) => s.status === "READY")
    .filter(
      (s) =>
        (!f("speaker") || s.speaker === f("speaker")) &&
        (!f("series") || s.series === f("series")) &&
        (!f("scripture") || s.scriptures.includes(f("scripture")!)) &&
        (!f("theme") || s.themes.includes(f("theme")!)) &&
        (!f("year") || s.sermonDate.startsWith(f("year")!)) &&
        (!f("tag") || s.tags.includes(f("tag")!)) &&
        (!term ||
          words.some((w) => [s.title, s.speaker, s.series, s.mainScripture, s.summary, ...s.themes].join(" ").toLowerCase().includes(w.replace(/(ing|s)$/, "")))),
    )
    .sort((a, b) => b.sermonDate.localeCompare(a.sermonDate))
    .map(publicSermon);
  return page(all, { page: body.page as number | undefined, pageSize: body.pageSize as number | undefined }, 12);
}

type Ctx = { db: MockDb; q: URLSearchParams; body: Record<string, unknown>; m: RegExpMatchArray };
type Route = [string, RegExp, (c: Ctx) => unknown];

const routes: Route[] = [
  // ---------- auth ----------
  ["GET", /^\/auth\/me$/, ({ db }) => meOf(db, db.sessionUserId)],
  [
    "POST",
    /^\/auth\/login$/,
    ({ db, body }) => {
      const u = db.users.find((x) => x.email.toLowerCase() === String(body.email).toLowerCase());
      if (!u || u.password !== body.password) fail(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
      db.sessionUserId = u.id;
      return meOf(db, u.id);
    },
  ],
  [
    "POST",
    /^\/auth\/register$/,
    ({ db, body }) => {
      const email = String(body.email).trim().toLowerCase();
      if (db.users.some((x) => x.email === email)) fail(409, "EMAIL_TAKEN", "An account with this email already exists.", { email: ["Already in use"] });
      const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
      const phoneDigits = phoneNumber.replace(/\D/g, "");
      if (!/^\+?[0-9\s().-]+$/.test(phoneNumber) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        fail(422, "VALIDATION_ERROR", "Enter a valid phone number.", { phoneNumber: ["Enter a valid phone number"] });
      }
      const id = nextId(db, "user");
      const fullName = String(body.fullName);
      const churchName = typeof body.churchName === "string" && body.churchName.trim() ? body.churchName.trim() : "Your Ministry";
      db.users.push({ id, fullName, email, password: String(body.password), phoneNumber, onboardingCompleted: true });
      db.churches[id] = {
        id: nextId(db, "church"),
        name: churchName,
        slug: churchName.toLowerCase().replace(/\W+/g, "-"),
        ownerRole: "",
        denomination: typeof body.denomination === "string" && body.denomination.trim() ? body.denomination.trim() : null,
        address: typeof body.churchAddress === "string" && body.churchAddress.trim() ? body.churchAddress.trim() : null,
        primaryColor: typeof body.primaryColor === "string" && body.primaryColor ? body.primaryColor : null,
        secondaryColor: typeof body.secondaryColor === "string" && body.secondaryColor ? body.secondaryColor : null,
        accentColor: typeof body.accentColor === "string" && body.accentColor ? body.accentColor : null,
      };
      db.sermons[id] = [];
      db.content[id] = [];
      db.integrations[id] = DEFAULT_INTEGRATIONS.map((i) => ({ ...i }));
      db.sessionUserId = id;
      return meOf(db, id);
    },
  ],
  ["POST", /^\/auth\/logout$/, ({ db }) => void (db.sessionUserId = null)],
  [
    "PATCH",
    /^\/auth\/me$/,
    ({ db, body }) => {
      const u = currentUser(db);
      u.fullName = String(body.fullName);
      u.email = String(body.email).toLowerCase();
      return meOf(db, u.id);
    },
  ],
  [
    "POST",
    /^\/auth\/change-password$/,
    ({ db, body }) => {
      const u = currentUser(db);
      if (u.password !== body.currentPassword) fail(422, "WRONG_PASSWORD", "Your current password is incorrect.", { currentPassword: ["Incorrect"] });
      u.password = String(body.newPassword);
    },
  ],
  ["POST", /^\/auth\/forgot-password$/, () => undefined],
  ["POST", /^\/auth\/reset-password$/, () => undefined],

  // ---------- church ----------
  [
    "POST",
    /^\/church$/,
    ({ db, body }) => {
      const u = currentUser(db);
      if (db.churches[u.id]) fail(409, "CHURCH_EXISTS", "You already have a church.");
      db.churches[u.id] = {
        slug: String(body.name).toLowerCase().replace(/\W+/g, "-"),
        preferredBibleTranslation: "NIV",
        devotionalTone: "Warm and pastoral",
        socialTone: "Encouraging and concise",
        audienceDescription: "",
        wordsToAvoid: "",
        additionalAIContext: "",
        ...(body as unknown as Church),
        id: nextId(db, "church"),
      };
      u.onboardingCompleted = true; // creating the church completes onboarding
      return meOf(db, u.id);
    },
  ],
  ["GET", /^\/church$/, ({ db }) => db.churches[currentUser(db).id] ?? fail(404, "NOT_FOUND", "No church yet.")],
  [
    "PATCH",
    /^\/church$/,
    ({ db, body }) => {
      const u = currentUser(db);
      const { logoObjectKey, ...rest } = body as Record<string, unknown>;
      db.churches[u.id] = { ...db.churches[u.id], ...(rest as Partial<Church>), ...(logoObjectKey ? { logoUrl: null } : {}) };
      return db.churches[u.id];
    },
  ],
  [
    "POST",
    /^\/church\/logo\/presign$/,
    ({ db, body }) => {
      currentUser(db);
      return presign(db, String(body.fileName), String(body.contentType), "logos");
    },
  ],
  [
    "POST",
    /^\/uploads\/presign$/,
    ({ db, body }) => {
      currentUser(db);
      return presign(db, String(body.fileName), String(body.contentType), "sermons");
    },
  ],

  // ---------- dashboard / analytics ----------
  [
    "GET",
    /^\/dashboard$/,
    ({ db }) => {
      const uid = currentUser(db).id;
      const sermons = sermonsOf(db).sort((a, b) => b.sermonDate.localeCompare(a.sermonDate));
      const content = db.content[uid];
      const som = startOfMonth(new Date());
      return {
        sermonsThisMonth: sermons.filter((s) => parseISO(s.createdAt) >= som).length,
        contentGenerated: content.length,
        scheduled: content.filter((c) => c.status === "SCHEDULED").length,
        published: content.filter((c) => c.status === "PUBLISHED").length,
        latestSermon: sermons[0] ? publicSermon(sermons[0]) : null,
      };
    },
  ],
  [
    "GET",
    /^\/analytics$/,
    ({ db }): AnalyticsSummary => {
      const c = contentOf(db);
      const sermons = sermonsOf(db);
      return {
        sermonsUploaded: sermons.length,
        sermonsProcessed: sermons.filter((s) => s.status === "READY").length,
        contentGenerated: c.length,
        contentApproved: c.filter((x) => x.status === "APPROVED").length,
        contentScheduled: c.filter((x) => x.status === "SCHEDULED").length,
        contentPublished: c.filter((x) => x.status === "PUBLISHED").length,
        processingFailures: sermons.filter((s) => s.status === "FAILED").length,
        generationFailures: 0,
        publishingMetrics: null,
      };
    },
  ],

  // ---------- sermons ----------
  [
    "GET",
    /^\/sermons$/,
    ({ db, q }) => {
      const statuses = q.get("status")?.split(",");
      const term = q.get("q")?.toLowerCase();
      const all = sermonsOf(db)
        .filter((s) => (statuses ? statuses.includes(s.status) : s.status !== "ARCHIVED"))
        .filter((s) => !term || `${s.title} ${s.speaker} ${s.series} ${s.mainScripture}`.toLowerCase().includes(term))
        .sort((a, b) => b.sermonDate.localeCompare(a.sermonDate))
        .map(publicSermon);
      return page(all, q, 8);
    },
  ],
  [
    "POST",
    /^\/sermons$/,
    ({ db, body }) => {
      const uid = currentUser(db).id;
      const b = body as Record<string, unknown>;
      if (!b.objectKey && !b.transcriptText) fail(422, "VALIDATION_ERROR", "Provide a file or a transcript.", { objectKey: ["Required"] });
      const id = nextId(db, "sermon");
      const title = String(b.title);
      const scripture = typeof b.mainScripture === "string" ? b.mainScripture : undefined;
      db.sermons[uid].push({
        id,
        title,
        speaker: String(b.speaker),
        sermonDate: String(b.sermonDate),
        series: (b.series as string | undefined) ?? null,
        mainScripture: scripture ?? null,
        tags: (b.tags as string[]) ?? [],
        status: "UPLOADED",
        processingStage: "UPLOAD",
        contentCount: 0,
        summary: `A message on ${title.toLowerCase()} exploring what it means to trust God and take the next faithful step.`,
        mainTheme: "Trusting God",
        scriptures: scripture ? [scripture] : ["2 Corinthians 5:7"],
        themes: ["Faith", "Trust"],
        createdAt: nowIso(),
        processingStartedAt: Date.now(),
      });
      return { id };
    },
  ],
  ["GET", /^\/sermons\/([^/]+)$/, ({ db, m }) => publicSermon(findSermon(db, m[1]))],
  [
    "PATCH",
    /^\/sermons\/([^/]+)$/,
    ({ db, m, body }) => {
      const s = findSermon(db, m[1]);
      for (const k of ["title", "speaker", "sermonDate", "series", "mainScripture", "tags"] as const) {
        if (body[k] !== undefined) (s as unknown as Record<string, unknown>)[k] = body[k];
      }
      return publicSermon(s);
    },
  ],
  [
    "DELETE",
    /^\/sermons\/([^/]+)$/,
    ({ db, m }) => {
      const uid = currentUser(db).id;
      findSermon(db, m[1]);
      db.sermons[uid] = db.sermons[uid].filter((s) => s.id !== m[1]);
      db.content[uid] = db.content[uid].filter((c) => c.sermonId !== m[1]);
    },
  ],
  ["GET", /^\/sermons\/([^/]+)\/status$/, ({ db, m }) => statusInfo(findSermon(db, m[1]))],
  [
    "POST",
    /^\/sermons\/([^/]+)\/status\/retry$/,
    ({ db, m }) => {
      const s = findSermon(db, m[1]);
      if (s.status !== "FAILED") fail(409, "NOT_RETRYABLE", "This sermon isn't in a failed state.");
      s.failAt = undefined;
      s.status = "QUEUED";
      s.processingStage = "MEDIA";
      s.processingStartedAt = Date.now();
      return statusInfo(s);
    },
  ],
  [
    "GET",
    /^\/sermons\/([^/]+)\/transcript$/,
    ({ db, m }) => {
      const s = findSermon(db, m[1]);
      if (s.status !== "READY") fail(409, "NOT_READY", "This sermon is still being processed.");
      return transcriptFor(s.title);
    },
  ],
  [
    "GET",
    /^\/sermons\/([^/]+)\/intelligence$/,
    ({ db, m }) => {
      const s = findSermon(db, m[1]);
      if (s.status !== "READY") fail(409, "NOT_READY", "This sermon is still being processed.");
      return intelligenceFor();
    },
  ],
  [
    "POST",
    /^\/sermons\/([^/]+)\/generate-week$/,
    ({ db, m, body }) => {
      const s = findSermon(db, m[1]);
      if (s.status !== "READY") fail(409, "NOT_READY", "This sermon isn't ready yet.");
      const g = { id: nextId(db, "group"), sermonId: m[1], types: body.contentTypes as ContentType[], startedAt: Date.now(), materialized: false };
      db.groups.push(g);
      return groupOf(db, g.id);
    },
  ],
  ["GET", /^\/sermons\/([^/]+)\/generations\/([^/]+)$/, ({ db, m }) => groupOf(db, m[2])],

  // ---------- content ----------
  [
    "GET",
    /^\/content$/,
    ({ db, q }) => {
      const generationId = q.get("generationId");
      const generation = generationId ? db.groups.find((group) => group.id === generationId && group.sermonId === q.get("sermonId")) : undefined;
      const term = q.get("q")?.toLowerCase();
      const scheduled = q.get("scheduled");
      const channel = q.get("channel");
      const channelContentIds = new Set(
        (db.posts[currentUser(db).id] ?? [])
          .filter((post) => post.targets.some((target) => target.platform === channel))
          .map((post) => post.contentId),
      );
      const all = contentOf(db)
        .filter(
          (c) =>
            (!q.get("status") || c.status === q.get("status")) &&
            (!q.get("type") || c.type === q.get("type")) &&
            (!q.get("sermonId") || c.sermonId === q.get("sermonId")) &&
            (!channel || channelContentIds.has(c.id)) &&
            (!generationId || !!generation?.contentIds?.includes(c.id)) &&
            (scheduled === null || (scheduled === "true") === !!c.calendarItemId) &&
            (!term || `${c.title} ${c.body}`.toLowerCase().includes(term)),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((c) => refreshVisual(db, c));
      return page(all, q);
    },
  ],
  ["GET", /^\/content\/([^/]+)$/, ({ db, m }) => findContent(db, m[1])],
  [
    "PATCH",
    /^\/content\/([^/]+)$/,
    ({ db, m, body }) => {
      const c = findContent(db, m[1]);
      assertEditable(c);
      demoteToDraft(c);
      if (body.scripture !== undefined) c.scripture = String(body.scripture) || null;
      if (body.structured !== undefined) c.structured = body.structured as ContentItem["structured"];
      pushVersion(db, c, "USER_EDIT", (body.title as string) ?? c.title, (body.body as string) ?? c.body);
      return c;
    },
  ],
  [
    "POST",
    /^\/content\/([^/]+)\/approve$/,
    ({ db, m }) => {
      const c = findContent(db, m[1]);
      assertEditable(c);
      c.status = "APPROVED";
      c.updatedAt = nowIso();
      return c;
    },
  ],
  [
    "POST",
    /^\/content\/([^/]+)\/rewrite$/,
    ({ db, m, body }) => {
      const c = findContent(db, m[1]);
      assertEditable(c);
      demoteToDraft(c);
      pushVersion(db, c, "AI_REWRITE", c.title, rewrite(c.body, String(body.action)));
      return c;
    },
  ],
  [
    "POST",
    /^\/content\/([^/]+)\/regenerate$/,
    ({ db, m }) => {
      const c = findContent(db, m[1]);
      assertEditable(c);
      demoteToDraft(c);
      pushVersion(db, c, "AI_REWRITE", c.title, rewrite(c.body, "REGENERATE"));
      return c;
    },
  ],
  [
    "DELETE",
    /^\/content\/([^/]+)$/,
    ({ db, m }) => {
      const uid = currentUser(db).id;
      findContent(db, m[1]);
      db.content[uid] = db.content[uid].filter((c) => c.id !== m[1]);
      delete db.versions[m[1]];
    },
  ],
  [
    "GET",
    /^\/content\/([^/]+)\/versions$/,
    ({ db, m }) => {
      const c = findContent(db, m[1]);
      return [...(db.versions[c.id] ?? [firstVersion(c)])].sort((a, b) => b.version - a.version);
    },
  ],
  [
    "POST",
    /^\/content\/([^/]+)\/versions\/(\d+)\/restore$/,
    ({ db, m }) => {
      const c = findContent(db, m[1]);
      assertEditable(c);
      const v = (db.versions[c.id] ?? []).find((x) => x.version === Number(m[2]));
      if (!v) fail(404, "NOT_FOUND", "Version not found.");
      demoteToDraft(c);
      pushVersion(db, c, "USER_EDIT", v.title, v.body);
      return c;
    },
  ],

  // ---------- calendar ----------
  [
    "GET",
    /^\/calendar$/,
    ({ db, q }) => {
      const interval = { start: parseISO(q.get("from")!), end: parseISO(q.get("to")!) };
      return contentOf(db)
        .filter((c) => c.calendarItemId && c.scheduledAt && isWithinInterval(parseISO(c.scheduledAt), interval))
        .map(calendarItem);
    },
  ],
  [
    "POST",
    /^\/calendar$/,
    ({ db, body }) => {
      const c = findContent(db, String(body.contentItemId));
      if (c.status !== "APPROVED" && c.status !== "SCHEDULED") fail(422, "CONTENT_NOT_APPROVED", "Approve this content before scheduling it.");
      assertFuture(body.scheduledAt);
      c.status = "SCHEDULED";
      c.scheduledAt = String(body.scheduledAt);
      c.calendarItemId = c.calendarItemId ?? `cal-${c.id}`;
      return calendarItem(c);
    },
  ],
  [
    "PATCH",
    /^\/calendar\/([^/]+)$/,
    ({ db, m, body }) => {
      const c = contentOf(db).find((x) => x.calendarItemId === m[1]);
      if (!c) fail(404, "NOT_FOUND", "Calendar item not found.");
      assertFuture(body.scheduledAt);
      c.scheduledAt = String(body.scheduledAt);
      c.status = "SCHEDULED";
      return calendarItem(c);
    },
  ],
  [
    "DELETE",
    /^\/calendar\/([^/]+)$/,
    ({ db, m }) => {
      const c = contentOf(db).find((x) => x.calendarItemId === m[1]);
      if (!c) fail(404, "NOT_FOUND", "Calendar item not found.");
      c.calendarItemId = null;
      c.scheduledAt = null;
      c.status = "APPROVED";
    },
  ],

  // ---------- library / ask ----------
  ["POST", /^\/library\/search$/, ({ db, body }) => librarySearch(db, body)],
  ["POST", /^\/library\/semantic-search$/, ({ db, body }) => librarySearch(db, body, String(body.query ?? ""))],
  [
    "GET",
    /^\/library\/facets$/,
    ({ db }) => {
      const list = sermonsOf(db).filter((s) => s.status === "READY");
      const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();
      return {
        speakers: uniq(list.map((s) => s.speaker)),
        series: uniq(list.map((s) => s.series)),
        scriptures: uniq(list.flatMap((s) => s.scriptures)),
        themes: uniq(list.flatMap((s) => s.themes)),
        years: uniq(list.map((s) => s.sermonDate.slice(0, 4))).reverse(),
        tags: uniq(list.flatMap((s) => s.tags)),
      };
    },
  ],
  [
    "POST",
    /^\/ask$/,
    ({ db, body }) => {
      const words = String(body.question).toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const hits = sermonsOf(db)
        .filter((s) => s.status === "READY")
        .filter((s) => words.some((w) => [s.title, ...s.themes, s.summary].join(" ").toLowerCase().includes(w.replace(/s$/, ""))))
        .slice(0, 3);
      if (!hits.length) return { answer: "I couldn't find a sermon in your archive that speaks to this yet.", sources: [] };
      return {
        answer: `Across ${hits.length} of your sermons, the message returns to trusting God when the way is unclear: ${hits.map((s) => `“${s.title}”`).join(", ")}. The teaching consistently pairs honest questions with one faithful next step.`,
        sources: hits.map((s) => {
          const seg = transcriptFor(s.title)[2];
          return { sermonId: s.id, sermonTitle: s.title, segmentId: seg.id, startTimeMs: seg.startTimeMs, endTimeMs: seg.endTimeMs, excerpt: seg.text };
        }),
      };
    },
  ],

  // ---------- brand studio ----------
  ["GET", /^\/brand-studio$/, ({ db }) => brandOf(db)],
  [
    "PUT",
    /^\/brand-studio$/,
    ({ db, body }) => {
      const b = brandOf(db);
      const { assets: _a, logoUrl: _l, alternateLogoUrl: _al, churchId: _c, ...rest } = body as Partial<BrandProfile>;
      void _a; void _l; void _al; void _c;
      Object.assign(b, rest);
      return brandOf(db);
    },
  ],
  [
    "POST",
    /^\/brand-studio\/assets\/presign$/,
    ({ db, body }) => {
      const b = brandOf(db);
      const kind = body.kind as BrandProfile["assets"][number]["kind"];
      const asset = { id: nextId(db, "asset"), kind, name: String(body.fileName), url: placeholderAsset(kind, String(body.fileName)), createdAt: nowIso() };
      b.assets.push(asset);
      return { ...presign(db, String(body.fileName), String(body.contentType), "brand"), assetId: asset.id };
    },
  ],
  [
    "DELETE",
    /^\/brand-studio\/assets\/([^/]+)$/,
    ({ db, m }) => {
      const b = brandOf(db);
      if (!b.assets.some((a) => a.id === m[1])) fail(404, "NOT_FOUND", "Asset not found.");
      b.assets = b.assets.filter((a) => a.id !== m[1]);
      if (b.logoAssetId === m[1]) b.logoAssetId = null;
      if (b.alternateLogoAssetId === m[1]) b.alternateLogoAssetId = null;
    },
  ],
  ["GET", /^\/brand-studio\/templates$/, ({ db }) => templatesOf(db)],
  [
    "PUT",
    /^\/brand-studio\/templates\/(\w+)\/default$/,
    ({ db, m, body }) => {
      const tpl = TEMPLATES.find((t) => t.id === body.templateId && t.category === m[1]);
      if (!tpl) fail(422, "VALIDATION_ERROR", "That template doesn't belong to this category.", { templateId: ["Invalid template"] });
      (db.templateDefaults[currentUser(db).id] ??= {})[m[1] as TemplateCategory] = tpl.id;
      return templatesOf(db);
    },
  ],
  [
    "POST",
    /^\/content\/([^/]+)\/render$/,
    ({ db, m, body }) => {
      const c = findContent(db, m[1]);
      c.visual = { status: "RENDERING", assets: [], thumbnailUrl: null, errorMessage: null };
      db.renders[c.id] = { startedAt: Date.now(), format: String(body.format ?? "instagram-portrait"), templateId: body.templateId as string | undefined, backgroundAssetId: body.backgroundAssetId as string | null | undefined, overrides: body.overrides as { headline?: string; body?: string } | undefined };
      return c;
    },
  ],
  [
    "POST",
    /^\/content\/([^/]+)\/carousel\/slides\/(\d+)\/regenerate$/,
    ({ db, m }) => {
      const c = findContent(db, m[1]);
      assertEditable(c);
      const slide = c.structured?.carousel?.slides[Number(m[2])];
      if (!slide) fail(404, "NOT_FOUND", "Slide not found.");
      slide.body = `${slide.body.replace(/ \(refreshed\)$/, "")} (refreshed)`;
      c.updatedAt = nowIso();
      c.visual = null;
      return c;
    },
  ],

  // ---------- social ----------
  ["GET", /^\/social\/capabilities$/, ({ db }) => (currentUser(db), CAPABILITIES)],
  ["GET", /^\/social\/connections$/, ({ db }) => db.connections[currentUser(db).id] ?? []],
  [
    "GET",
    /^\/social\/connections\/(\w+)\/authorize$/,
    ({ db, m }) => {
      const uid = currentUser(db).id;
      const list = (db.connections[uid] ??= []);
      const add = (platform: SocialPost["targets"][number]["platform"], name: string) => {
        const existing = list.find((c) => c.platform === platform);
        if (existing) Object.assign(existing, { status: "connected", connectedAt: nowIso() });
        else list.push({ id: nextId(db, "conn"), platform, accountName: name, avatarUrl: null, status: "connected", connectedAt: nowIso() });
      };
      // Demo mode: pretend the provider round-trip succeeded immediately.
      const provider = m[1];
      if (provider === "meta") { add("facebook", "Grace Community Church"); add("instagram", "@gracecommunity"); }
      else add(provider as "tiktok" | "youtube" | "x" | "linkedin", "@gracecommunity");
      return { authorizationUrl: `/social-accounts?connected=${provider}` };
    },
  ],
  [
    "DELETE",
    /^\/social\/connections\/([^/]+)$/,
    ({ db, m }) => {
      const uid = currentUser(db).id;
      db.connections[uid] = (db.connections[uid] ?? []).filter((c) => c.id !== m[1]);
    },
  ],
  [
    "POST",
    /^\/social\/connections\/([^/]+)\/reconnect$/,
    ({ db, m }) => {
      const c = (db.connections[currentUser(db).id] ?? []).find((x) => x.id === m[1]);
      if (!c) fail(404, "NOT_FOUND", "Connection not found.");
      c.status = "connected";
      c.connectedAt = nowIso();
      return { authorizationUrl: `/social-accounts?connected=${c.platform}` };
    },
  ],
  [
    "GET",
    /^\/social\/posts$/,
    ({ db, q }) => {
      const uid = currentUser(db).id;
      const from = q.get("from") ? parseISO(q.get("from")!) : null;
      const to = q.get("to") ? parseISO(q.get("to")!) : null;
      const all = (db.posts[uid] ?? [])
        .map((p) => postDto(db, uid, p))
        .filter((p) => {
          const at = parseISO(p.scheduledAt ?? p.createdAt);
          return (!from || at >= from) && (!to || at <= to) && (!q.get("status") || p.status === q.get("status")) && (!q.get("contentId") || p.contentId === q.get("contentId"));
        })
        .sort((a, b) => (b.scheduledAt ?? b.createdAt).localeCompare(a.scheduledAt ?? a.createdAt));
      return page(all, q, 50);
    },
  ],
  [
    "POST",
    /^\/social\/posts$/,
    ({ db, body }) => {
      const uid = currentUser(db).id;
      const content = findContent(db, String(body.contentId));
      const targets = (body.targets as MockPost["targets"]) ?? [];
      if (!targets.length) fail(422, "VALIDATION_ERROR", "Choose at least one platform.", { targets: ["Choose at least one platform"] });
      for (const t of targets) {
        const conn = (db.connections[uid] ?? []).find((c) => c.id === t.connectionId);
        if (!conn || conn.status !== "connected") fail(422, "CONNECTION_INVALID", `Reconnect ${t.platform} before posting.`, { targets: [`${t.platform} needs to be reconnected`] });
      }
      const post: MockPost = { id: nextId(db, "post"), contentId: content.id, title: String(body.title ?? content.title), caption: String(body.caption ?? ""), mediaAssetIds: (body.mediaAssetIds as string[]) ?? [], targets, scheduledAt: null, createdAt: nowIso() };
      (db.posts[uid] ??= []).push(post);
      return postDto(db, uid, post);
    },
  ],
  ["GET", /^\/social\/posts\/([^/]+)$/, ({ db, m }) => postDto(db, currentUser(db).id, findPost(db, m[1]))],
  [
    "POST",
    /^\/social\/posts\/([^/]+)\/publish$/,
    ({ db, m }) => {
      const p = findPost(db, m[1]);
      p.publishAt = Date.now();
      p.results = undefined;
      p.scheduledAt = null;
      return postDto(db, currentUser(db).id, p);
    },
  ],
  [
    "POST",
    /^\/social\/posts\/([^/]+)\/schedule$/,
    ({ db, m, body }) => {
      const p = findPost(db, m[1]);
      assertFuture(body.scheduledAt);
      p.scheduledAt = String(body.scheduledAt);
      p.publishAt = undefined;
      return postDto(db, currentUser(db).id, p);
    },
  ],
  [
    "POST",
    /^\/social\/posts\/([^/]+)\/retry$/,
    ({ db, m }) => {
      const uid = currentUser(db).id;
      const p = findPost(db, m[1]);
      const current = postDto(db, uid, p);
      if (!current.canRetry) fail(409, "NOT_RETRYABLE", "This post can't be retried.");
      p.keep = current.results.filter((r) => r.status === "PUBLISHED");
      p.results = undefined;
      p.publishAt = Date.now();
      return postDto(db, uid, p);
    },
  ],

  // ---------- billing / integrations ----------
  [
    "GET",
    /^\/billing\/subscription$/,
    ({ db }) => {
      currentUser(db);
      return { planId: "growth", planName: "Growth", priceLabel: "₦25,000 / month", status: "ACTIVE", currentPeriodEnd: addDays(new Date(), 12).toISOString() };
    },
  ],
  [
    "GET",
    /^\/billing\/usage$/,
    ({ db }) => ({
      sermonsUsed: sermonsOf(db).filter((s) => parseISO(s.createdAt) >= startOfMonth(new Date())).length + 6,
      sermonsLimit: 15,
      contentGenerated: contentOf(db).length + 130,
      periodEnd: addDays(new Date(), 12).toISOString(),
    }),
  ],
  ["POST", /^\/billing\/portal$/, () => fail(501, "NOT_AVAILABLE", "Billing portal isn't available in demo mode.")],
  ["GET", /^\/integrations$/, ({ db }) => db.integrations[currentUser(db).id]],
  [
    "POST",
    /^\/integrations\/(\w+)\/connect$/,
    ({ db, m }) => {
      const i = db.integrations[currentUser(db).id].find((x) => x.provider === m[1])!;
      i.status = "CONNECTED";
      i.accountLabel = "Grace Community (demo)";
      return { authorizationUrl: "" };
    },
  ],
  [
    "DELETE",
    /^\/integrations\/(\w+)$/,
    ({ db, m }) => {
      const i = db.integrations[currentUser(db).id].find((x) => x.provider === m[1])!;
      i.status = "NOT_CONNECTED";
      i.accountLabel = null;
    },
  ],
];

function presign(db: MockDb, fileName: string, contentType: string, folder: string) {
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  return {
    uploadUrl: `mock://storage/${folder}/${nextId(db, "obj")}${ext}`,
    method: "PUT" as const,
    headers: { "Content-Type": contentType },
    objectKey: `churches/mock/${folder}/${nextId(db, "key")}${ext}`,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  };
}

function assertFuture(value: unknown) {
  if (parseISO(String(value)) < new Date()) fail(422, "PAST_DATE", "Choose a time in the future.", { scheduledAt: ["Must be in the future"] });
}

export async function handleMock(method: string, url: string, body?: unknown, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  await wait(method === "GET" ? 150 : 300);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const [path, query = ""] = url.split("?");
  const db = load();
  for (const [m, re, fn] of routes) {
    const match = path.match(re);
    if (m === method && match) {
      const out = fn({ db, q: new URLSearchParams(query), body: (body ?? {}) as Record<string, unknown>, m: match });
      save();
      return out === undefined ? undefined : JSON.parse(JSON.stringify(out));
    }
  }
  fail(404, "NOT_FOUND", `No mock for ${method} ${path}`);
}
