"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { socialService, type CreateSocialPost, type SocialPostListParams } from "@/services/social.service";
import type { SocialPost, SocialProvider } from "@/types";

export const socialKeys = {
  connections: ["social", "connections"] as const,
  capabilities: ["social", "capabilities"] as const,
  posts: (p: SocialPostListParams) => ["social", "posts", p] as const,
};

const ACTIVE = ["QUEUED", "PUBLISHING", "RENDERING"];

export const useConnections = () => useQuery({ queryKey: socialKeys.connections, queryFn: ({ signal }) => socialService.connections(signal) });
export const useCapabilities = () => useQuery({ queryKey: socialKeys.capabilities, queryFn: ({ signal }) => socialService.capabilities(signal), staleTime: 5 * 60_000 });

/** Lists posts, polling while any are mid-publish. */
export const usePosts = (p: SocialPostListParams, enabled = true) =>
  useQuery({
    queryKey: socialKeys.posts(p),
    queryFn: ({ signal }) => socialService.listPosts(p, signal),
    enabled,
    refetchInterval: (q) => (q.state.data?.items.some((x) => ACTIVE.includes(x.status)) ? 2000 : false),
  });

function useRefreshPosts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["social", "posts"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
  };
}

export function useConnectionActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: socialKeys.connections });
  return {
    connect: useMutation({ mutationFn: (provider: SocialProvider) => socialService.authorize(provider) }),
    reconnect: useMutation({ mutationFn: (id: string) => socialService.reconnect(id) }),
    disconnect: useMutation({ mutationFn: (id: string) => socialService.disconnect(id), onSuccess: refresh }),
  };
}

export function usePostActions() {
  const refresh = useRefreshPosts();
  return {
    create: useMutation({ mutationFn: (v: CreateSocialPost) => socialService.createPost(v), onSuccess: refresh }),
    publish: useMutation({ mutationFn: (id: string) => socialService.publish(id), onSuccess: refresh }),
    schedule: useMutation({ mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) => socialService.schedule(id, scheduledAt), onSuccess: refresh }),
    retry: useMutation({ mutationFn: (id: string) => socialService.retry(id), onSuccess: refresh }),
    /** Create + publish/schedule as one user action. */
    createAnd: useMutation({
      mutationFn: async ({ post, then }: { post: CreateSocialPost; then: { kind: "draft" } | { kind: "publish" } | { kind: "schedule"; scheduledAt: string } }): Promise<SocialPost> => {
        const created = await socialService.createPost(post);
        if (then.kind === "publish") return socialService.publish(created.id);
        if (then.kind === "schedule") return socialService.schedule(created.id, then.scheduledAt);
        return created;
      },
      onSuccess: refresh,
    }),
  };
}
