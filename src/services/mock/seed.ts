import { addDays, startOfWeek, subDays } from "date-fns";
import type {
  BrandProfile,
  CarouselContent,
  Church,
  ContentTemplate,
  ReelClip,
  SocialConnection,
  SocialPlatform,
  TemplateCategory,
  TemplateVariant,
  ContentItem,
  ContentType,
  ContentVersion,
  Integration,
  IntelligenceCategory,
  ProcessingStage,
  Sermon,
  SermonIntelligence,
  TranscriptSegment,
} from "@/types";

export interface MockSermon extends Sermon {
  /** epoch ms when processing began; drives the simulated pipeline. */
  processingStartedAt?: number;
  failAt?: ProcessingStage;
}

export interface MockGroup {
  id: string;
  sermonId: string;
  types: ContentType[];
  startedAt: number;
  materialized: boolean;
}

export interface MockPost {
  id: string;
  contentId: string;
  caption: string;
  title: string;
  mediaAssetIds: string[];
  targets: { platform: SocialPlatform; connectionId: string }[];
  scheduledAt: string | null;
  createdAt: string;
  /** epoch ms when publishing was requested; drives the simulated pipeline. */
  publishAt?: number;
  /** Frozen once publishing finishes, so later connection changes don't rewrite history. */
  results?: PlatformResultSnapshot[];
  /** Platforms that already succeeded and are kept on retry. */
  keep?: PlatformResultSnapshot[];
}

export type PlatformResultSnapshot = { platform: SocialPlatform; status: "PENDING" | "PUBLISHED" | "FAILED"; message?: string | null; externalUrl?: string | null };

export interface MockRender {
  startedAt: number;
  format: string;
  templateId?: string;
  backgroundAssetId?: string | null;
  overrides?: { headline?: string; body?: string };
}

export interface MockDb {
  users: { id: string; fullName: string; email: string; password: string; onboardingCompleted: boolean }[];
  sessionUserId: string | null;
  churches: Record<string, Church>;
  sermons: Record<string, MockSermon[]>;
  content: Record<string, ContentItem[]>;
  versions: Record<string, ContentVersion[]>;
  groups: MockGroup[];
  integrations: Record<string, Integration[]>;
  brand: Record<string, BrandProfile>;
  templateDefaults: Record<string, Partial<Record<TemplateCategory, string>>>;
  connections: Record<string, SocialConnection[]>;
  posts: Record<string, MockPost[]>;
  renders: Record<string, MockRender>;
  counter: number;
}

const VARIANTS: TemplateVariant[] = ["bold", "minimal", "gradient", "photo", "split", "outline"];
const VARIANT_NAMES: Record<TemplateVariant, string> = {
  bold: "Bold",
  minimal: "Minimal",
  gradient: "Gradient",
  photo: "Pastor Photo",
  split: "Split",
  outline: "Outline",
};
const CATEGORY_KEYS: TemplateCategory[] = ["SERMON_QUOTE", "SCRIPTURE", "PRAYER_POINT", "DEVOTIONAL", "CAROUSEL", "SUNDAY_INVITATION", "ANNOUNCEMENT", "TESTIMONY", "REEL", "YOUTUBE_THUMBNAIL"];

/** Three templates per category, rotating through the visual variants. */
export const TEMPLATES: Omit<ContentTemplate, "isDefault">[] = CATEGORY_KEYS.flatMap((category, ci) =>
  [0, 1, 2].map((k) => {
    const variant = VARIANTS[(ci + k) % VARIANTS.length];
    return { id: `tpl-${category.toLowerCase()}-${k + 1}`, category, name: `${VARIANT_NAMES[variant]} ${String(k + 1).padStart(2, "0")}`, variant };
  }),
);

export function defaultBrand(church: Church | undefined, churchId: string): BrandProfile {
  return {
    churchId,
    churchName: church?.name ?? "Your Church",
    logoUrl: null,
    alternateLogoUrl: null,
    logoAssetId: null,
    alternateLogoAssetId: null,
    primaryColor: church?.primaryColor || "#B5502F",
    secondaryColor: church?.secondaryColor || "#1B1A17",
    accentColor: "#E8A87C",
    headingFont: "Fraunces",
    bodyFont: "Inter",
    socialHandle: null,
    website: church?.website ?? null,
    watermarkEnabled: true,
    watermarkPosition: "bottom-right",
    footerText: null,
    voice: {
      tone: "Warm & Conversational",
      bibleTranslation: church?.preferredBibleTranslation ?? "NIV",
      emojiUsage: "occasionally",
      writingStyle: null,
      preferredTerms: [{ preferred: "Church family", insteadOf: "followers" }],
      avoidPhrases: [],
      ctaStyle: null,
      hashtagPreferences: [],
      exampleCaptions: [],
    },
    assets: [],
  };
}

export const CAPABILITIES = [
  { platform: "facebook", maxCaptionLength: 5000, supportedMedia: ["text", "image", "carousel", "video"], requiresMedia: false },
  { platform: "instagram", maxCaptionLength: 2200, supportedMedia: ["image", "carousel", "video"], requiresMedia: true, maxHashtags: 30 },
  { platform: "tiktok", maxCaptionLength: 2200, supportedMedia: ["video"], requiresMedia: true, maxVideoSeconds: 600 },
  { platform: "youtube", maxCaptionLength: 5000, supportedMedia: ["video"], requiresMedia: true, requiresTitle: true, maxVideoSeconds: 60 },
  { platform: "x", maxCaptionLength: 280, supportedMedia: ["text", "image", "video"], requiresMedia: false },
  { platform: "linkedin", maxCaptionLength: 3000, supportedMedia: ["text", "image", "carousel", "video"], requiresMedia: false },
] as const;

const iso = (d: Date) => d.toISOString();

export function lastSunday(now = new Date()) {
  const d = startOfWeek(now, { weekStartsOn: 0 });
  d.setHours(9, 0, 0, 0);
  return d > now ? subDays(d, 7) : d;
}

export function transcriptFor(title: string): TranscriptSegment[] {
  const lines = [
    `Good morning church. Today we're going to talk about ${title.toLowerCase()}, and I want to begin with a simple question: what do you do when you cannot see the road ahead?`,
    "Scripture tells us that we walk by faith, not by sight. That was not written to people who had every answer. It was written to people in the middle of uncertainty.",
    "Think about Abraham. God said go, and he went without a map. Faith is not the absence of questions. Faith is choosing to trust the one who holds the answers.",
    "I remember a season in our own church when the building fund seemed impossible. We prayed, we waited, and we kept showing up. God was faithful in ways we did not plan.",
    "So here is the application. This week, name one area where you have been waiting for certainty before you obey. Take one small step of trust in that area.",
    "Let's pray. Father, teach us to trust you when the path is unclear. Give us courage for the next step, and peace while we wait. In Jesus' name, amen.",
  ];
  let t = 0;
  return lines.map((text, i) => {
    const len = (95 + i * 22) * 1000;
    const seg: TranscriptSegment = { id: `seg-${i + 1}`, sequence: i + 1, startTimeMs: t, endTimeMs: t + len, text };
    t += len;
    return seg;
  });
}

export function intelligenceFor(): SermonIntelligence {
  const mk = (cat: IntelligenceCategory, items: [string, string?][]) =>
    items.map(([text, sourceSegmentId], i) => ({ id: `${cat}-${i}`, text, sourceSegmentId: sourceSegmentId ?? null }));
  return {
    themes: mk("themes", [["Trusting God without full clarity", "seg-2"], ["Obedience before certainty", "seg-5"], ["God's faithfulness over time", "seg-4"]]),
    keyPoints: mk("keyPoints", [
      ["Faith is not the absence of questions.", "seg-3"],
      ["We walk by faith, not by sight — even in uncertainty.", "seg-2"],
      ["Small steps of trust matter more than perfect understanding.", "seg-5"],
    ]),
    quotes: mk("quotes", [["Faith is choosing to trust the one who holds the answers.", "seg-3"], ["We prayed, we waited, and we kept showing up.", "seg-4"]]),
    stories: mk("stories", [["The season the church building fund seemed impossible.", "seg-4"], ["Abraham leaving without a map.", "seg-3"]]),
    applications: mk("applications", [["Name one area where you're waiting for certainty before obeying.", "seg-5"], ["Take one small step of trust this week.", "seg-5"]]),
    prayers: mk("prayers", [["Teach us to trust you when the path is unclear.", "seg-6"], ["Give us courage for the next step, and peace while we wait.", "seg-6"]]),
    questions: mk("questions", [["Where are you waiting for certainty before you obey?"], ["When has God been faithful in a way you didn't plan?"], ["What does one small step of trust look like this week?"]]),
  };
}

const BODIES: Record<ContentType, (t: string, n: number) => { title: string; body: string }> = {
  DEVOTIONAL: (t, n) => ({
    title: `Day ${n}: Walking without a map`,
    body: `Today's reflection comes from the message "${t}".\n\nFaith is not the absence of questions; it is choosing to trust the one who holds the answers. Where are you waiting for certainty before you obey?\n\nTake one small step of trust today, and ask God for peace while you wait.\n\nPrayer: Father, teach me to trust you when the path is unclear.`,
  }),
  SOCIAL_POST: (t, n) => ({
    title: `Social post ${n}`,
    body: `You don't need the whole map to take the next step. Walk by faith today. 🕊️\n\n#${t.replace(/\W+/g, "")} #Faith`,
  }),
  PRAYER: (t) => ({
    title: `Prayer points — ${t}`,
    body: "1. Ask God for courage to take the next step.\n2. Pray for peace while waiting on an answer.\n3. Thank God for past faithfulness.\n4. Pray for someone in your life facing uncertainty.",
  }),
  BIBLE_STUDY: (t) => ({
    title: `Discussion guide — ${t}`,
    body: "Read 2 Corinthians 5:7.\n\n1. Where are you waiting for certainty before you obey?\n2. When has God been faithful in a way you didn't plan?\n3. What does one small step of trust look like this week?",
  }),
  EMAIL: (t) => ({
    title: `This week's newsletter — ${t}`,
    body: "Grace and peace,\n\nThis Sunday we explored what it means to walk by faith when the road ahead is unclear. Here's a short recap and one step to take this week.\n\nSee you Sunday.",
  }),
  WHATSAPP: (_t, n) => ({
    title: `WhatsApp message ${n}`,
    body: "Hi family 👋 A reminder from Sunday: faith isn't the absence of questions. What's one step of trust you can take today?",
  }),
  QUOTE: (_t, n) => ({ title: `Quote ${n}`, body: "“Faith is choosing to trust the one who holds the answers.”" }),
  VIDEO_IDEA: (t) => ({
    title: `Clip idea — ${t}`,
    body: "Suggested clip: the Abraham illustration, roughly 1:35–3:10. Open with the question “What do you do when you can't see the road ahead?”",
  }),
};

export function makeContent(
  id: string,
  sermon: { id: string; title: string },
  type: ContentType,
  n: number,
  extra: Partial<ContentItem> = {},
): ContentItem {
  const { title, body } = BODIES[type](sermon.title, n);
  const seg = transcriptFor(sermon.title)[Math.min(n, 5) % 6];
  return {
    id,
    title,
    body,
    type,
    status: "DRAFT",
    sermonId: sermon.id,
    sermonTitle: sermon.title,
    scripture: type === "DEVOTIONAL" || type === "BIBLE_STUDY" ? "2 Corinthians 5:7" : null,
    calendarItemId: null,
    scheduledAt: null,
    publishedAt: null,
    currentVersion: 1,
    updatedAt: iso(new Date()),
    source: {
      sermonId: sermon.id,
      sermonTitle: sermon.title,
      segments: [{ id: seg.id, startTimeMs: seg.startTimeMs, endTimeMs: seg.endTimeMs, text: seg.text }],
      scriptures: ["2 Corinthians 5:7"],
      verbatim: type === "QUOTE",
    },
    structured: structuredFor(type, n, sermon, seg),
    visual: null,
    ...extra,
  };
}

function structuredFor(type: ContentType, n: number, sermon: { id: string; title: string }, seg: TranscriptSegment): ContentItem["structured"] {
  if (type === "SOCIAL_POST" && n % 3 === 0) {
    const carousel: CarouselContent = {
      title: `Notes: ${sermon.title}`,
      slides: [
        { title: sermon.title, body: "Sunday's message in five slides." },
        { title: "Faith is not the absence of questions", body: "It is choosing to trust the one who holds the answers." },
        { title: "Abraham went without a map", body: "God said go. He went." },
        { title: "Your next step", body: "Name one area where you are waiting for certainty before you obey." },
        { title: "Take one small step of trust", body: "Pray, then act." },
      ],
      cta: "Join us this Sunday",
    };
    return { carousel };
  }
  if (type === "VIDEO_IDEA") {
    const reel: ReelClip = {
      sermonId: sermon.id,
      startTimeMs: seg.startTimeMs,
      endTimeMs: Math.min(seg.endTimeMs, seg.startTimeMs + 45_000),
      hook: "What do you do when you can't see the road ahead?",
      speakerName: "Pastor John",
      videoUrl: null,
      durationMs: 1_200_000,
      subtitlesEnabled: true,
      subtitleStyle: "Bold outline",
      watermark: true,
      aspect: "9:16",
      caption: "Faith isn't the absence of questions. 🙏 #faith",
      platforms: ["instagram", "tiktok", "youtube"],
    };
    return { reel };
  }
  return null;
}

export function firstVersion(c: ContentItem): ContentVersion {
  return { version: 1, title: c.title, body: c.body, source: "AI_GENERATED", aiProvider: "mock", aiModel: "mock-1", createdAt: c.updatedAt };
}

export const DEFAULT_INTEGRATIONS: Integration[] = [
  { provider: "WHATSAPP", status: "NOT_CONNECTED", accountLabel: null },
  { provider: "EMAIL", status: "NOT_CONNECTED", accountLabel: null },
];

export const DEMO_EMAIL = "demo@abydesermon.app";
export const DEMO_PASSWORD = "demo1234";

export function seedDb(): MockDb {
  const now = new Date();
  const sun = lastSunday(now);
  const sermon = (
    n: number,
    title: string,
    speaker: string,
    weeksAgo: number,
    scripture: string,
    series: string,
    themes: string[],
    extra: Partial<MockSermon> = {},
  ): MockSermon => ({
    id: `sermon-${n}`,
    title,
    speaker,
    sermonDate: iso(subDays(sun, weeksAgo * 7)),
    series,
    mainScripture: scripture,
    tags: [],
    status: "READY",
    processingStage: null,
    contentCount: 0,
    summary: `A message on ${title.toLowerCase()} — what it means to trust God when the way forward isn't clear, and how to take the next faithful step.`,
    mainTheme: themes[0],
    scriptures: [scripture],
    themes,
    createdAt: iso(subDays(sun, weeksAgo * 7)),
    ...extra,
  });

  const sermons = [
    sermon(1, "Walking By Faith", "Pastor John", 0, "2 Corinthians 5:7", "Trust", ["Faith", "Trust", "Obedience"]),
    sermon(2, "Peace in the Storm", "Pastor John", 1, "Mark 4:35–41", "Trust", ["Fear", "Peace", "Trust"]),
    sermon(3, "Forgiven to Forgive", "Pastor Grace", 2, "Matthew 18:21–35", "Grace", ["Forgiveness", "Grace"]),
    sermon(4, "Home Built on Rock", "Pastor John", 4, "Matthew 7:24–27", "Family", ["Marriage", "Family", "Foundations"]),
    sermon(5, "The Long Obedience", "Guest: Rev. Adaeze", 6, "Hebrews 12:1–3", "Endurance", ["Perseverance", "Hope"], {
      status: "FAILED",
      failAt: "TRANSCRIBE",
    }),
  ];
  const [s1, s2] = sermons;

  const monday = addDays(startOfWeek(now, { weekStartsOn: 0 }), 1);
  const at = (day: number, hourUtc: number) => iso(new Date(addDays(monday, day).setUTCHours(hourUtc, 0, 0, 0)));
  const content: ContentItem[] = [];
  const dev = (n: number, status: ContentItem["status"], day?: number) =>
    makeContent(`c-dev-${n}`, s1, "DEVOTIONAL", n, {
      status,
      scheduledAt: day === undefined ? null : at(day, 6),
      calendarItemId: day === undefined ? null : `cal-c-dev-${n}`,
    });
  content.push(dev(1, "PUBLISHED", 0), dev(2, "SCHEDULED", 1), dev(3, "SCHEDULED", 2), dev(4, "APPROVED"), dev(5, "DRAFT"), dev(6, "DRAFT"), dev(7, "DRAFT"));
  content.push(
    makeContent("c-soc-1", s1, "SOCIAL_POST", 1, { status: "SCHEDULED", scheduledAt: at(1, 11), calendarItemId: "cal-c-soc-1" }),
    makeContent("c-pray-1", s1, "PRAYER", 1, { status: "SCHEDULED", scheduledAt: at(2, 18), calendarItemId: "cal-c-pray-1" }),
    makeContent("c-bible-1", s1, "BIBLE_STUDY", 1),
    makeContent("c-quote-1", s1, "QUOTE", 1, { status: "FAILED", scheduledAt: at(4, 8), calendarItemId: "cal-c-quote-1" }),
    makeContent("c-email-1", s1, "EMAIL", 1),
    makeContent("c-car-1", s1, "SOCIAL_POST", 3, { title: "Carousel: Walking By Faith" }),
    makeContent("c-reel-1", s1, "VIDEO_IDEA", 1, { title: "Reel: Walking without a map" }),
  );
  const types: ContentType[] = ["DEVOTIONAL", "SOCIAL_POST", "PRAYER", "WHATSAPP"];
  for (let i = 1; i <= 8; i++) {
    content.push(makeContent(`c-old-${i}`, s2, types[i % 4], i, { status: i % 3 ? "PUBLISHED" : "APPROVED" }));
  }
  s1.contentCount = content.filter((c) => c.sermonId === s1.id).length;
  s2.contentCount = content.filter((c) => c.sermonId === s2.id).length;

  const connections: SocialConnection[] = [
    { id: "conn-fb", platform: "facebook", accountName: "Grace Community Church", avatarUrl: null, status: "connected", connectedAt: iso(subDays(now, 20)) },
    { id: "conn-ig", platform: "instagram", accountName: "@gracecommunity", avatarUrl: null, status: "connected", connectedAt: iso(subDays(now, 20)) },
    { id: "conn-tt", platform: "tiktok", accountName: "@gracecommunity", avatarUrl: null, status: "expired", connectedAt: iso(subDays(now, 60)) },
  ];
  const posts: MockPost[] = [
    {
      id: "post-1",
      contentId: "c-dev-1",
      title: "Day 1: Walking without a map",
      caption: "Faith isn't the absence of questions. 🙏 #faith",
      mediaAssetIds: [],
      targets: [
        { platform: "facebook", connectionId: "conn-fb" },
        { platform: "instagram", connectionId: "conn-ig" },
        { platform: "tiktok", connectionId: "conn-tt" },
      ],
      scheduledAt: null,
      createdAt: iso(subDays(now, 1)),
      publishAt: subDays(now, 1).getTime(),
    },
    {
      id: "post-2",
      contentId: "c-soc-1",
      title: "Social post 1",
      caption: "You don't need the whole map to take the next step.",
      mediaAssetIds: [],
      targets: [{ platform: "facebook", connectionId: "conn-fb" }],
      scheduledAt: at(5, 7),
      createdAt: iso(now),
    },
  ];

  return {
    users: [{ id: "user-demo", fullName: "John Okafor", email: DEMO_EMAIL, password: DEMO_PASSWORD, onboardingCompleted: true }],
    sessionUserId: null,
    churches: {
      "user-demo": {
        id: "church-demo",
        name: "Grace Community Church",
        slug: "grace-community-church",
        ownerRole: "Lead Pastor",
        denomination: "Non-denominational",
        website: null,
        logoUrl: null,
        preferredBibleTranslation: "NIV",
        primaryColor: "#B5502F",
        secondaryColor: null,
        devotionalTone: "Warm and pastoral",
        socialTone: "Encouraging and concise",
        audienceDescription: "",
        wordsToAvoid: "",
        additionalAIContext: "",
      },
    },
    sermons: { "user-demo": sermons },
    content: { "user-demo": content },
    versions: Object.fromEntries(content.map((c) => [c.id, [firstVersion(c)]])),
    groups: [],
    integrations: { "user-demo": DEFAULT_INTEGRATIONS.map((i) => ({ ...i })) },
    brand: {},
    templateDefaults: { "user-demo": { SERMON_QUOTE: "tpl-sermon_quote-1" } },
    connections: { "user-demo": connections },
    posts: { "user-demo": posts },
    renders: {},
    counter: 100,
  };
}
