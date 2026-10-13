import { api } from "./api-client";
import type { CarouselContent, ContentItem, ContentStatus, ContentType, ContentVersion, Paginated, RenderRequest, ReelClip, SocialPlatform } from "@/types";

export interface ContentListParams {
  status?: ContentStatus;
  type?: ContentType;
  sermonId?: string;
  generationId?: string;
  /** Content with a saved social post targeting this platform. */
  channel?: SocialPlatform;
  q?: string;
  scheduled?: boolean;
  page?: number;
  pageSize?: number;
}

export type RewriteAction = "SHORTEN" | "EXPAND" | "WARMER" | "CONVERSATIONAL" | "ALTERNATIVE";

export const contentService = {
  list: (params: ContentListParams, signal?: AbortSignal): Promise<Paginated<ContentItem>> =>
    api.getPage<ContentItem>("/content", { params: { ...params }, signal }),
  /** Read every matching page so a content group is never split across pages. */
  listAll: async (params: Omit<ContentListParams, "page" | "pageSize">, signal?: AbortSignal): Promise<Paginated<ContentItem>> => {
    const first = await contentService.list({ ...params, page: 1, pageSize: 100 }, signal);
    const items = [...first.items];
    if (first.pageSize < 1) throw new Error("Invalid content page size");
    const pages = Math.ceil(first.total / first.pageSize);
    for (let page = 2; page <= pages; page++) {
      const next = await contentService.list({ ...params, page, pageSize: first.pageSize }, signal);
      items.push(...next.items);
    }
    return { ...first, items, total: items.length };
  },
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
