import { api, uploadToSignedUrl } from "./api-client";
import type { BrandAsset, BrandAssetKind, BrandProfile, ContentTemplate, PresignedUpload, TemplateCategory } from "@/types";

export type BrandProfileInput = Omit<BrandProfile, "assets" | "logoUrl" | "alternateLogoUrl" | "churchId">;

export function toInput(p: BrandProfile): BrandProfileInput {
  const { assets: _a, logoUrl: _l, alternateLogoUrl: _al, churchId: _c, ...rest } = p;
  void _a;
  void _l;
  void _al;
  void _c;
  return rest;
}

export const brandService = {
  get: (signal?: AbortSignal) => api.get<BrandProfile>("/brand-studio", { signal }),
  save: (p: BrandProfile) => api.put<BrandProfile>("/brand-studio", toInput(p)),
  /**
   * presign -> direct upload to storage. The API registers the asset at presign time and
   * marks it ready once the object exists, so no confirm call is needed.
   */
  uploadAsset: async (file: File, kind: BrandAssetKind, onProgress: (pct: number) => void = () => undefined) => {
    const presigned = await api.post<PresignedUpload & { assetId: string }>("/brand-studio/assets/presign", {
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      kind,
    });
    await uploadToSignedUrl(presigned, file, onProgress);
    return presigned.assetId;
  },
  removeAsset: (id: string) => api.delete<void>(`/brand-studio/assets/${id}`),
  templates: (signal?: AbortSignal) => api.get<ContentTemplate[]>("/brand-studio/templates", { signal }),
  /** `category` is the template category (the spec's :contentType). */
  setDefaultTemplate: (category: TemplateCategory, templateId: string) =>
    api.put<ContentTemplate[]>(`/brand-studio/templates/${category}/default`, { templateId }),
};

export type { BrandAsset };
