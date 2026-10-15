"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sermonService, statusGroup, type SermonListParams, type SermonPatch } from "@/services/sermon.service";
import type { ContentType } from "@/types";

export const sermonKeys = {
  all: ["sermons"] as const,
  list: (p: SermonListParams) => ["sermons", "list", p] as const,
  detail: (id: string) => ["sermons", "detail", id] as const,
  processing: (id: string) => ["sermons", "processing", id] as const,
  transcript: (id: string) => ["sermons", "transcript", id] as const,
  intelligence: (id: string) => ["sermons", "intelligence", id] as const,
  dashboard: ["dashboard"] as const,
};

export const useDashboard = () =>
  useQuery({ queryKey: sermonKeys.dashboard, queryFn: ({ signal }) => sermonService.dashboard(signal) });

export const useSermons = (params: SermonListParams, enabled = true) =>
  useQuery({
    enabled,
    queryKey: sermonKeys.list(params),
    queryFn: ({ signal }) => sermonService.list(params, signal),
    placeholderData: keepPreviousData,
  });

export const useSermon = (id: string) =>
  useQuery({ queryKey: sermonKeys.detail(id), queryFn: ({ signal }) => sermonService.get(id, signal) });

/** Polls processing state until the sermon is READY or FAILED. */
export function useProcessing(id: string, enabled = true) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: sermonKeys.processing(id),
    queryFn: async ({ signal }) => {
      const state = await sermonService.processing(id, signal);
      if (statusGroup(state.status) !== "PROCESSING") {
        qc.invalidateQueries({ queryKey: sermonKeys.detail(id) });
        qc.invalidateQueries({ queryKey: sermonKeys.all });
      }
      return state;
    },
    enabled,
    refetchInterval: (q) => (!q.state.data || statusGroup(q.state.data.status) === "PROCESSING" ? 2000 : false),
    staleTime: 0,
  });
}

export function useRetryProcessing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sermonService.retryProcessing(id),
    onSuccess: (state) => {
      qc.setQueryData(sermonKeys.processing(id), state);
      qc.invalidateQueries({ queryKey: sermonKeys.detail(id) });
    },
  });
}

export const useTranscript = (id: string, enabled: boolean) =>
  useQuery({ queryKey: sermonKeys.transcript(id), queryFn: ({ signal }) => sermonService.transcript(id, signal), enabled });

export const useIntelligence = (id: string, enabled: boolean) =>
  useQuery({ queryKey: sermonKeys.intelligence(id), queryFn: ({ signal }) => sermonService.intelligence(id, signal), enabled });

export function useStartGeneration(sermonId: string) {
  return useMutation({ mutationFn: (types: ContentType[]) => sermonService.generate(sermonId, types) });
}

export function useUpdateSermon(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: SermonPatch) => sermonService.update(id, v),
    onSuccess: (sermon) => {
      qc.setQueryData(sermonKeys.detail(id), sermon);
      qc.invalidateQueries({ queryKey: sermonKeys.all });
      qc.invalidateQueries({ queryKey: sermonKeys.dashboard });
    },
  });
}

export function useDeleteSermon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sermonService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sermonKeys.all });
      qc.invalidateQueries({ queryKey: sermonKeys.dashboard });
      qc.invalidateQueries({ queryKey: ["content"] });
      qc.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useGenerationJob(sermonId: string, jobId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["generation", jobId],
    queryFn: async ({ signal }) => {
      const job = await sermonService.generation(sermonId, jobId!, signal);
      if (job.done) {
        qc.invalidateQueries({ queryKey: ["content"] });
        qc.invalidateQueries({ queryKey: sermonKeys.all });
        qc.invalidateQueries({ queryKey: sermonKeys.dashboard });
      }
      return job;
    },
    enabled: !!jobId,
    refetchInterval: (q) => (q.state.data?.done ? false : 1500),
    staleTime: 0,
  });
}
