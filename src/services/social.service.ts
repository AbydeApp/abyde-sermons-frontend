import { api } from "./api-client";
import type { Paginated, PublishTarget, SocialCapability, SocialConnection, SocialPost, SocialPostStatus, SocialProvider } from "@/types";

export interface SocialPostListParams {
  from?: string;
  to?: string;
  status?: SocialPostStatus;
  contentId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSocialPost {
  contentId: string;
  caption: string;
  mediaAssetIds: string[];
  targets: PublishTarget[];
  /** Required by YouTube. */
  title?: string;
}

export const socialService = {
  connections: (signal?: AbortSignal) => api.get<SocialConnection[]>("/social/connections", { signal }),
  /** The API answers with the provider's authorization URL; secrets never reach the browser. */
  authorize: (provider: SocialProvider) => api.get<{ authorizationUrl: string }>(`/social/connections/${provider}/authorize`),
  disconnect: (connectionId: string) => api.delete<void>(`/social/connections/${connectionId}`),
  reconnect: (connectionId: string) => api.post<{ authorizationUrl: string }>(`/social/connections/${connectionId}/reconnect`),
  capabilities: (signal?: AbortSignal) => api.get<SocialCapability[]>("/social/capabilities", { signal }),

  createPost: (v: CreateSocialPost) => api.post<SocialPost>("/social/posts", v),
  getPost: (id: string, signal?: AbortSignal) => api.get<SocialPost>(`/social/posts/${id}`, { signal }),
  listPosts: (p: SocialPostListParams, signal?: AbortSignal): Promise<Paginated<SocialPost>> =>
    api.getPage<SocialPost>("/social/posts", { params: { ...p }, signal }),
  publish: (id: string) => api.post<SocialPost>(`/social/posts/${id}/publish`),
  schedule: (id: string, scheduledAt: string) => api.post<SocialPost>(`/social/posts/${id}/schedule`, { scheduledAt }),
  retry: (id: string) => api.post<SocialPost>(`/social/posts/${id}/retry`),
};
