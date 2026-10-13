"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { calendarService } from "@/services/calendar.service";
import { contentService, type ContentListParams, type RewriteAction } from "@/services/content.service";
import { ApiError } from "@/services/api-client";
import type { ContentItem, RenderRequest } from "@/types";

export const contentKeys = {
  list: (p: ContentListParams) => ["content", "list", p] as const,
  detail: (id: string) => ["content", "detail", id] as const,
  versions: (id: string) => ["content", "versions", id] as const,
};

export const useContentList = (params: ContentListParams) =>
  useQuery({
    queryKey: contentKeys.list(params),
    queryFn: ({ signal }) => contentService.list(params, signal),
    placeholderData: keepPreviousData,
  });

/** Polls while a render is in flight so `visual.status` flips to READY on its own. */
export const useContentItem = (id: string) =>
  useQuery({
    queryKey: contentKeys.detail(id),
    queryFn: ({ signal }) => contentService.get(id, signal),
    refetchInterval: (q) => (q.state.data?.visual?.status === "RENDERING" ? 1500 : false),
  });

export const useContentVersions = (id: string, enabled: boolean) =>
  useQuery({ queryKey: contentKeys.versions(id), queryFn: ({ signal }) => contentService.versions(id, signal), enabled });

function useRefreshers(id?: string) {
  const qc = useQueryClient();
  return {
    item: (item: ContentItem) => {
      qc.setQueryData(contentKeys.detail(item.id), item);
      qc.invalidateQueries({ queryKey: ["content", "list"] });
      qc.invalidateQueries({ queryKey: ["content", "versions"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    all: () => {
      if (id) qc.invalidateQueries({ queryKey: contentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["content"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["sermons"] });
    },
  };
}

/** Mutations for a single content item. Server responses replace the cached detail. */
export function useContentMutations(id: string) {
  const r = useRefreshers(id);
  return {
    save: useMutation({ mutationFn: (v: Parameters<typeof contentService.update>[1]) => contentService.update(id, v), onSuccess: r.item }),
    approve: useMutation({ mutationFn: () => contentService.approve(id), onSuccess: r.item }),
    rewrite: useMutation({ mutationFn: (a: RewriteAction) => contentService.rewrite(id, a), onSuccess: r.item }),
    regenerate: useMutation({ mutationFn: () => contentService.regenerate(id), onSuccess: r.item }),
    regenerateSlide: useMutation({ mutationFn: (index: number) => contentService.regenerateSlide(id, index), onSuccess: r.item }),
    restore: useMutation({ mutationFn: (version: number) => contentService.restore(id, version), onSuccess: r.item }),
    schedule: useMutation({
      mutationFn: ({ item, scheduledAt }: { item: ContentItem; scheduledAt: string }) => calendarService.schedule(item, scheduledAt),
      onSuccess: r.all,
    }),
    unschedule: useMutation({ mutationFn: (calendarItemId: string) => calendarService.remove(calendarItemId), onSuccess: r.all }),
  };
}

export function useDeleteContent() {
  const r = useRefreshers();
  return useMutation({ mutationFn: (id: string) => contentService.remove(id), onSuccess: r.all });
}

export const useCalendarRange = (from: string, to: string) =>
  useQuery({
    queryKey: ["calendar", "range", from, to],
    queryFn: ({ signal }) => calendarService.range(from, to, signal),
    placeholderData: keepPreviousData,
  });

export const useUnscheduled = () =>
  useQuery({ queryKey: ["calendar", "unscheduled"], queryFn: ({ signal }) => calendarService.unscheduled(signal) });

export function useCalendarMutations() {
  const r = useRefreshers();
  return {
    schedule: useMutation({
      mutationFn: ({ item, scheduledAt }: { item: { id: string; calendarItemId?: string | null }; scheduledAt: string }) =>
        calendarService.schedule(item, scheduledAt),
      onSuccess: r.all,
    }),
    unschedule: useMutation({ mutationFn: (calendarItemId: string) => calendarService.remove(calendarItemId), onSuccess: r.all }),
  };
}

/** Starts a render and resolves once the visual is READY (polling the content item). */
export function useRenderFlow(id: string) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (req: RenderRequest): Promise<ContentItem> => {
      setBusy(true);
      try {
        let item = await contentService.render(id, req);
        qc.setQueryData(contentKeys.detail(id), item);
        for (let i = 0; i < 60 && item.visual?.status === "RENDERING"; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          item = await contentService.get(id);
          qc.setQueryData(contentKeys.detail(id), item);
        }
        if (item.visual?.status !== "READY") throw new ApiError(0, "RENDER_FAILED", item.visual?.errorMessage ?? "Rendering didn't finish. Please try again.");
        qc.invalidateQueries({ queryKey: ["social", "posts"] });
        return item;
      } finally {
        setBusy(false);
      }
    },
    [id, qc],
  );
  return { run, busy };
}
