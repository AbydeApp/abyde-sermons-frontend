import { api, uploadToSignedUrl } from "./api-client";
import type {
  DashboardSummary,
  ContentType,
  GenerationGroup,
  Paginated,
  PresignedUpload,
  ProcessingStage,
  ProcessingState,
  Sermon,
  SermonIntelligence,
  SermonStatus,
  SermonStatusGroup,
  SermonStatusInfo,
  TranscriptSegment,
} from "@/types";

export const STAGES: { key: ProcessingStage; label: string }[] = [
  { key: "UPLOAD", label: "Upload complete" },
  { key: "MEDIA", label: "Preparing media" },
  { key: "TRANSCRIBE", label: "Transcribing sermon" },
  { key: "UNDERSTAND", label: "Understanding message" },
  { key: "SCRIPTURES", label: "Detecting scriptures" },
  { key: "INTELLIGENCE", label: "Building sermon intelligence" },
  { key: "INDEX", label: "Preparing search index" },
];

const PROCESSING_STATUSES: SermonStatus[] = ["UPLOADING", "UPLOADED", "QUEUED", "TRANSCRIBING", "ANALYZING", "INDEXING"];

/** The list endpoint takes a comma-separated `status`. */
export function statusParam(group?: SermonStatusGroup): string | undefined {
  if (!group) return undefined;
  return group === "PROCESSING" ? PROCESSING_STATUSES.join(",") : group;
}

export function statusGroup(status: SermonStatus): SermonStatusGroup | "ARCHIVED" {
  if (status === "READY" || status === "FAILED" || status === "ARCHIVED") return status;
  return "PROCESSING";
}

/** Builds the 7-step stepper from GET /sermons/:id/status. */
export function buildProcessingState(info: SermonStatusInfo): ProcessingState {
  const failedIdx = info.failedStage ? STAGES.findIndex((s) => s.key === info.failedStage) : -1;
  const currentIdx = Math.max(0, STAGES.findIndex((s) => s.key === info.processingStage));
  const steps = STAGES.map((s, i) => {
    let status: ProcessingState["steps"][number]["status"];
    if (info.status === "READY") status = "complete";
    else if (info.status === "FAILED") status = failedIdx < 0 ? "pending" : i < failedIdx ? "complete" : i === failedIdx ? "failed" : "pending";
    else status = i < currentIdx ? "complete" : i === currentIdx ? "active" : "pending";
    return { ...s, status };
  });
  return {
    sermonId: info.sermonId,
    status: info.status,
    steps,
    error: info.errorMessage ?? undefined,
    canRetry: info.canRetry,
  };
}

export interface SermonListParams {
  group?: SermonStatusGroup;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface SermonMeta {
  title: string;
  speaker: string;
  date: string;
  series?: string;
  mainScripture?: string;
  tags?: string;
}

export interface CreateSermonInput {
  meta: SermonMeta;
  file?: File;
  transcript?: string;
}

export type SermonPatch = Partial<Omit<SermonMeta, "tags">> & { tags?: string };

function tagList(tags?: string) {
  return tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

export const sermonService = {
  dashboard: (signal?: AbortSignal) => api.get<DashboardSummary>("/dashboard", { signal }),
  list: (p: SermonListParams, signal?: AbortSignal): Promise<Paginated<Sermon>> =>
    api.getPage<Sermon>("/sermons", { params: { status: statusParam(p.group), q: p.q, page: p.page, pageSize: p.pageSize }, signal }),
  get: (id: string, signal?: AbortSignal) => api.get<Sermon>(`/sermons/${id}`, { signal }),
  /** presign -> direct-to-storage upload (progress) -> create sermon (202). Paste-transcript skips the upload. */
  create: async (input: CreateSermonInput, onProgress: (pct: number) => void, signal?: AbortSignal) => {
    const { meta } = input;
    const base = {
      title: meta.title,
      speaker: meta.speaker,
      sermonDate: new Date(meta.date).toISOString(),
      series: meta.series || undefined,
      mainScripture: meta.mainScripture || undefined,
      tags: tagList(meta.tags),
    };
    if (input.file) {
      const presigned = await api.post<PresignedUpload>("/uploads/presign", {
        fileName: input.file.name,
        contentType: input.file.type || "application/octet-stream",
        sizeBytes: input.file.size,
        purpose: "SERMON_MEDIA",
      });
      await uploadToSignedUrl(presigned, input.file, onProgress, signal);
      return api.post<{ id: string }>("/sermons", { ...base, objectKey: presigned.objectKey });
    }
    onProgress(100);
    return api.post<{ id: string }>("/sermons", { ...base, transcriptText: input.transcript });
  },
  update: (id: string, v: SermonPatch) =>
    api.patch<Sermon>(`/sermons/${id}`, {
      title: v.title,
      speaker: v.speaker,
      sermonDate: v.date ? new Date(v.date).toISOString() : undefined,
      series: v.series,
      mainScripture: v.mainScripture,
      tags: v.tags === undefined ? undefined : tagList(v.tags),
    }),
  remove: (id: string) => api.delete<void>(`/sermons/${id}`),
  processing: async (id: string, signal?: AbortSignal) =>
    buildProcessingState(await api.get<SermonStatusInfo>(`/sermons/${id}/status`, { signal })),
  retryProcessing: async (id: string) => buildProcessingState(await api.post<SermonStatusInfo>(`/sermons/${id}/status/retry`)),
  transcript: (id: string, signal?: AbortSignal) => api.get<TranscriptSegment[]>(`/sermons/${id}/transcript`, { signal }),
  intelligence: (id: string, signal?: AbortSignal) => api.get<SermonIntelligence>(`/sermons/${id}/intelligence`, { signal }),
  generate: (id: string, contentTypes: ContentType[]) => api.post<GenerationGroup>(`/sermons/${id}/generate-week`, { contentTypes }),
  generation: (id: string, groupId: string, signal?: AbortSignal) =>
    api.get<GenerationGroup>(`/sermons/${id}/generations/${groupId}`, { signal }),
};
