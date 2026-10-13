import { api } from "./api-client";
import type { CarouselContent, ContentItem, ContentStatus, ContentType, ContentVersion, Paginated, RenderRequest, ReelClip } from "@/types";

export interface ContentListParams {
  status?: ContentStatus;
  type?: ContentType;
  sermonId?: string;
  q?: string;
  scheduled?: boolean;
  page?: number;
  pageSize?: number;
}

export type RewriteAction = "SHORTEN" | "EXPAND" | "WARMER" | "CONVERSATIONAL" | "ALTERNATIVE";

export const contentService = {
  list: (params: ContentListParams, signal?: AbortSignal): Promise<Paginated<ContentItem>> =>
    api.getPage<ContentItem>("/content", { params: { ...params }, signal }),
  get: (id: string, signal?: AbortSignal) => api.get<ContentItem>(`/content/${id}`, { signal }),
  update: (id: string, v: { title?: string; body?: string; scripture?: string; structured?: { carousel?: CarouselContent; reel?: ReelClip } }) =>
    api.patch<ContentItem>(`/content/${id}`, v),
  approve: (id: string) => api.post<ContentItem>(`/content/${id}/approve`),
  /** Persists immediately as a new AI_REWRITE version. */
  rewrite: (id: string, action: RewriteAction) => api.post<ContentItem>(`/content/${id}/rewrite`, { action }),
  regenerate: (id: string) => api.post<ContentItem>(`/content/${id}/regenerate`),
  remove: (id: string) => api.delete<void>(`/content/${id}`),
  /** Starts a render; poll GET /content/:id until `visual.status` is READY. */
  render: (id: string, req: RenderRequest) => api.post<ContentItem>(`/content/${id}/render`, req),
  regenerateSlide: (id: string, index: number) => api.post<ContentItem>(`/content/${id}/carousel/slides/${index}/regenerate`),
  versions: (id: string, signal?: AbortSignal) => api.get<ContentVersion[]>(`/content/${id}/versions`, { signal }),
  restore: (id: string, version: number) => api.post<ContentItem>(`/content/${id}/versions/${version}/restore`),
};
