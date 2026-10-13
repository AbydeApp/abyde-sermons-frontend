/** Types mirror the backend contract (ABYDE_SERMON_BACKEND.md + Addendum A). */

export interface User {
  id: string;
  fullName: string;
  email: string;
  onboardingComplete: boolean;
}

export interface Church {
  id: string;
  name: string;
  slug?: string;
  ownerRole: string;
  denomination?: string | null;
  website?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  preferredBibleTranslation?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  devotionalTone?: string | null;
  socialTone?: string | null;
  audienceDescription?: string | null;
  wordsToAvoid?: string | null;
  additionalAIContext?: string | null;
}

/** Response of GET /auth/me, POST /auth/login, POST /auth/register, POST /church. */
export interface MeResponse {
  authenticated: boolean;
  user: { id: string; fullName: string; email: string } | null;
  onboardingCompleted: boolean;
  church: Church | null;
}

/** UI session derived from MeResponse (null when signed out). */
export interface Session {
  user: User;
  church: Church | null;
}

export type SermonStatus =
  | "UPLOADING"
  | "UPLOADED"
  | "QUEUED"
  | "TRANSCRIBING"
  | "ANALYZING"
  | "INDEXING"
  | "READY"
  | "FAILED"
  | "ARCHIVED";

export type SermonStatusGroup = "PROCESSING" | "READY" | "FAILED";

export type ProcessingStage =
  | "UPLOAD"
  | "MEDIA"
  | "TRANSCRIBE"
  | "UNDERSTAND"
  | "SCRIPTURES"
  | "INTELLIGENCE"
  | "INDEX";

export interface Sermon {
  id: string;
  title: string;
  speaker: string;
  sermonDate: string;
  series?: string | null;
  mainScripture?: string | null;
  tags: string[];
  status: SermonStatus;
  processingStage: ProcessingStage | null;
  summary?: string | null;
  mainTheme?: string | null;
  scriptures: string[];
  themes: string[];
  contentCount: number;
  createdAt: string;
}

/** GET /sermons/:id/status */
export interface SermonStatusInfo {
  sermonId: string;
  status: SermonStatus;
  processingStage: ProcessingStage | null;
  failedStage: ProcessingStage | null;
  errorMessage: string | null;
  canRetry: boolean;
}

export type StepStatus = "complete" | "active" | "pending" | "failed";

export interface ProcessingStep {
  key: ProcessingStage;
  label: string;
  status: StepStatus;
}

export interface ProcessingState {
  sermonId: string;
  status: SermonStatus;
  steps: ProcessingStep[];
  error?: string;
  canRetry: boolean;
}

export interface TranscriptSegment {
  id: string;
  sequence: number;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  speakerLabel?: string | null;
}

export interface IntelligenceItem {
  id: string;
  text: string;
  sourceSegmentId?: string | null;
}

export type IntelligenceCategory =
  | "themes"
  | "keyPoints"
  | "quotes"
  | "stories"
  | "applications"
  | "prayers"
  | "questions";

export type SermonIntelligence = Record<IntelligenceCategory, IntelligenceItem[]>;

export type ContentType =
  | "DEVOTIONAL"
  | "SOCIAL_POST"
  | "PRAYER"
  | "BIBLE_STUDY"
  | "EMAIL"
  | "WHATSAPP"
  | "QUOTE"
  | "VIDEO_IDEA";

export type GenerationOption = ContentType;

export type ContentStatus = "DRAFT" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "FAILED" | "ARCHIVED";

export interface ContentSourceSegment {
  id: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

export interface ContentSource {
  sermonId: string;
  sermonTitle: string;
  segments: ContentSourceSegment[];
  scriptures: string[];
  /** true only when the body is a direct extract from the transcript; AI prose is always false. */
  verbatim: boolean;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  body: string;
  status: ContentStatus;
  sermonId: string;
  sermonTitle: string;
  scripture?: string | null;
  calendarItemId?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  currentVersion: number;
  updatedAt: string;
  source: ContentSource;
  /** Structured payloads for visual formats (carousel slides, reel clip settings). */
  structured?: { carousel?: CarouselContent; reel?: ReelClip } | null;
  /** Render state of the generated visual(s); absent means nothing rendered yet. */
  visual?: ContentVisual | null;
}

export type VersionSource = "AI_GENERATED" | "AI_REWRITE" | "USER_EDIT";

export interface ContentVersion {
  version: number;
  title: string;
  body: string;
  source: VersionSource;
  aiProvider?: string | null;
  aiModel?: string | null;
  createdAt: string;
}

export type JobStatus = "QUEUED" | "PROCESSING" | "RETRYING" | "COMPLETED" | "FAILED";

export interface GenerationJobState {
  contentType: ContentType;
  status: JobStatus;
  errorMessage?: string | null;
}

export interface GenerationGroup {
  id: string;
  sermonId: string;
  jobs: GenerationJobState[];
  done: boolean;
}

export interface CalendarContentSummary {
  id: string;
  type: ContentType;
  title: string;
  status: ContentStatus;
  sermonId: string;
  sermonTitle: string;
}

export interface CalendarItem {
  id: string;
  contentItemId: string;
  scheduledAt: string;
  status: string;
  content: CalendarContentSummary;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Backend list envelope. */
export interface PagedResponse<T> {
  data: T[];
  meta: PageMeta;
}

/** UI-friendly flattened page. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AskSource {
  sermonId: string;
  sermonTitle: string;
  segmentId?: string;
  startTimeMs?: number;
  endTimeMs?: number;
  excerpt: string;
}

export interface AskAnswer {
  id: string;
  question: string;
  answer: string;
  sources: AskSource[];
}

export interface AnalyticsSummary {
  sermonsUploaded: number;
  sermonsProcessed: number;
  contentGenerated: number;
  contentApproved: number;
  contentScheduled: number;
  contentPublished: number;
  processingFailures: number;
  generationFailures: number;
  publishingMetrics: Record<string, number> | null;
}

export interface DashboardSummary {
  sermonsThisMonth: number;
  contentGenerated: number;
  scheduled: number;
  published: number;
  latestSermon: Sermon | null;
}

/** Social platforms live in Social Accounts; Integrations only covers messaging/email. */
export type IntegrationProvider = "WHATSAPP" | "EMAIL";
export type IntegrationStatus = "NOT_CONNECTED" | "CONNECTED" | "NEEDS_ATTENTION";

export interface Integration {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  accountLabel?: string | null;
}

export interface BillingInfo {
  plan: { id: string; name: string; priceLabel: string };
  status: string;
  sermonsUsed: number;
  sermonsLimit: number;
  contentGenerated: number;
  renewalDate: string;
}

export interface PresignedUpload {
  uploadUrl: string;
  method: "PUT";
  headers?: Record<string, string>;
  objectKey: string;
  expiresAt: string;
}

export interface LibraryFacets {
  speakers: string[];
  series: string[];
  scriptures: string[];
  themes: string[];
  years: string[];
  tags: string[];
}

/* ------------------------------------------------------------------ */
/* Brand Studio & social publishing (see Addendum B)                   */
/* ------------------------------------------------------------------ */

export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "youtube" | "x" | "linkedin";
/** OAuth provider slug used by /social/connections/:provider/authorize. Meta covers Facebook + Instagram. */
export type SocialProvider = "meta" | "tiktok" | "youtube" | "x" | "linkedin";

export type EmojiUsage = "none" | "rarely" | "occasionally" | "frequently";
export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
export type BrandAssetKind = "LOGO" | "PORTRAIT" | "VENUE" | "TEXTURE" | "STOCK" | "WATERMARK";

export interface BrandAsset {
  id: string;
  kind: BrandAssetKind;
  name: string;
  url: string;
  createdAt: string;
}

export interface BrandVoice {
  tone: string;
  bibleTranslation?: string | null;
  emojiUsage: EmojiUsage;
  writingStyle?: string | null;
  preferredTerms: Array<{ preferred: string; insteadOf?: string | null }>;
  avoidPhrases: string[];
  ctaStyle?: string | null;
  hashtagPreferences?: string[];
  exampleCaptions?: string[];
}

export interface BrandProfile {
  churchId: string;
  churchName: string;
  /** Read-only URLs resolved from the asset ids below. */
  logoUrl?: string | null;
  alternateLogoUrl?: string | null;
  logoAssetId?: string | null;
  alternateLogoAssetId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  socialHandle?: string | null;
  website?: string | null;
  watermarkEnabled: boolean;
  watermarkPosition: WatermarkPosition;
  footerText?: string | null;
  voice: BrandVoice;
  assets: BrandAsset[];
}

export type TemplateCategory =
  | "SERMON_QUOTE"
  | "SCRIPTURE"
  | "PRAYER_POINT"
  | "DEVOTIONAL"
  | "CAROUSEL"
  | "SUNDAY_INVITATION"
  | "ANNOUNCEMENT"
  | "TESTIMONY"
  | "REEL"
  | "YOUTUBE_THUMBNAIL";

export type TemplateVariant = "bold" | "minimal" | "gradient" | "photo" | "split" | "outline";

export type VisualFormat =
  | "instagram-portrait"
  | "instagram-square"
  | "carousel-slide"
  | "story"
  | "facebook"
  | "youtube-thumbnail";

export interface ContentTemplate {
  id: string;
  category: TemplateCategory;
  name: string;
  variant: TemplateVariant;
  isDefault: boolean;
}

export interface CarouselSlide {
  title?: string;
  body: string;
}

export interface CarouselContent {
  title: string;
  slides: CarouselSlide[];
  cta?: string;
}

export type ReelAspect = "9:16" | "1:1" | "4:5";

export interface ReelClip {
  sermonId: string;
  startTimeMs: number;
  endTimeMs: number;
  hook: string;
  speakerName?: string | null;
  videoUrl?: string | null;
  durationMs?: number;
  subtitlesEnabled: boolean;
  subtitleStyle: string;
  watermark: boolean;
  aspect: ReelAspect;
  caption: string;
  platforms?: SocialPlatform[];
}

export type RenderStatus = "NONE" | "RENDERING" | "READY" | "FAILED";

export interface MediaAsset {
  id: string;
  url: string;
  width: number;
  height: number;
  kind: "image" | "video";
}

export interface ContentVisual {
  status: RenderStatus;
  assets: MediaAsset[];
  thumbnailUrl?: string | null;
  errorMessage?: string | null;
}

export interface RenderRequest {
  templateId?: string;
  format?: VisualFormat;
  backgroundAssetId?: string | null;
  overrides?: { headline?: string; body?: string };
}

export interface SocialConnection {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  avatarUrl?: string | null;
  status: "connected" | "expired" | "revoked" | "error";
  connectedAt: string;
}

export interface SocialCapability {
  platform: SocialPlatform;
  maxCaptionLength: number;
  requiresTitle?: boolean;
  /** Media kinds the platform can publish. */
  supportedMedia: Array<"text" | "image" | "carousel" | "video">;
  /** true when the platform cannot post without media. */
  requiresMedia: boolean;
  maxVideoSeconds?: number;
  maxHashtags?: number;
}

export type SocialPostStatus =
  | "DRAFT"
  | "RENDERING"
  | "READY"
  | "SCHEDULED"
  | "QUEUED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "PARTIALLY_PUBLISHED"
  | "FAILED";

export interface PublishTarget {
  platform: SocialPlatform;
  connectionId: string;
}

export interface PlatformResult {
  platform: SocialPlatform;
  status: "PENDING" | "PUBLISHED" | "FAILED";
  message?: string | null;
  externalUrl?: string | null;
}

export interface SocialPost {
  id: string;
  contentId: string;
  contentType: ContentType;
  title: string;
  caption: string;
  mediaAssetIds: string[];
  thumbnailUrl?: string | null;
  targets: PublishTarget[];
  scheduledAt?: string | null;
  status: SocialPostStatus;
  results: PlatformResult[];
  /** The API says whether a retry is allowed; the UI never guesses. */
  canRetry: boolean;
  createdAt: string;
}
