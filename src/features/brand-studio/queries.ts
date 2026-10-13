"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { brandService } from "@/services/brand.service";
import type { BrandAssetKind, BrandProfile, TemplateCategory } from "@/types";

export const brandKeys = { profile: ["brand"] as const, templates: ["brand", "templates"] as const };

export const useBrandProfile = () => useQuery({ queryKey: brandKeys.profile, queryFn: ({ signal }) => brandService.get(signal) });
export const useTemplates = () => useQuery({ queryKey: brandKeys.templates, queryFn: ({ signal }) => brandService.templates(signal) });

export function useSaveBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: BrandProfile) => brandService.save(p),
    onSuccess: (p) => qc.setQueryData(brandKeys.profile, p),
  });
}

export function useUploadAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, kind, onProgress }: { file: File; kind: BrandAssetKind; onProgress?: (pct: number) => void }) =>
      brandService.uploadAsset(file, kind, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: brandKeys.profile }),
  });
}

export function useRemoveAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => brandService.removeAsset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: brandKeys.profile }),
  });
}

export function useSetDefaultTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, templateId }: { category: TemplateCategory; templateId: string }) => brandService.setDefaultTemplate(category, templateId),
    onSuccess: (list) => qc.setQueryData(brandKeys.templates, list),
  });
}
