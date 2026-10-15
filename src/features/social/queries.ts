"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentService } from "@/services/content.service";
import { socialService, type CreateSocialPost, type SocialPostListParams } from "@/services/social.service";
import type { SocialConnection, SocialPost, SocialProvider } from "@/types";
import { defaultCaption, type BulkEntry } from "./validation";

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

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BulkPostResult {
  posted: number;
  /** Titles that couldn't be approved or posted. */
  failed: string[];
}

/**
 * Approves any drafts, then creates one post per item for its valid platforms. Each item is independent,
 * so one failure never blocks the rest. When scheduling, items of the same type go out one per day.
 */
export function useBulkPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ plan, connections, when }: { plan: BulkEntry[]; connections: SocialConnection[]; when: { kind: "now" } | { kind: "schedule"; startAt: string } }): Promise<BulkPostResult> => {
      const entries = plan.filter((e) => e.targets.length > 0);
      const failed: string[] = [];
      const approved = await Promise.allSettled(entries.map((e) => (e.item.status === "DRAFT" ? contentService.approve(e.item.id) : Promise.resolve(e.item))));
      const dayByType = new Map<string, number>();
      let posted = 0;
      for (const [i, entry] of entries.entries()) {
        const { item } = entry;
        if (approved[i].status === "rejected") {
          failed.push(item.title);
          continue;
        }
        const day = dayByType.get(item.type) ?? 0;
        dayByType.set(item.type, day + 1);
        try {
          const post = await socialService.createPost({
            contentId: item.id,
            caption: defaultCaption(item),
            title: item.title,
            mediaAssetIds: item.visual?.status === "READY" ? item.visual.assets.map((a) => a.id) : [],
            targets: entry.targets.map((platform) => ({ platform, connectionId: connections.find((c) => c.platform === platform)!.id })),
          });
          if (when.kind === "now") await socialService.publish(post.id);
          else await socialService.schedule(post.id, new Date(new Date(when.startAt).getTime() + day * DAY_MS).toISOString());
          posted++;
        } catch {
          failed.push(item.title);
        }
      }
      return { posted, failed };
    },
    onSettled: () => {
      for (const key of [["social", "posts"], ["calendar"], ["content"], ["dashboard"]]) qc.invalidateQueries({ queryKey: key });
    },
  });
}
