import { api, uploadToSignedUrl } from "./api-client";
import { toSession } from "./auth.service";
import type { Church, MeResponse, PresignedUpload, Session } from "@/types";
import type { ChurchValues } from "@/schemas/onboarding";

export type ChurchPatch = Partial<Omit<Church, "id" | "slug" | "logoUrl">> & { logoObjectKey?: string };

export const churchService = {
  /** Creating the church completes onboarding (server-side). */
  create: async (v: ChurchValues): Promise<Session> => {
    const s = toSession(await api.post<MeResponse>("/church", v));
    if (!s) throw new Error("Expected an authenticated session");
    return s;
  },
  get: (signal?: AbortSignal) => api.get<Church>("/church", { signal }),
  update: (v: ChurchPatch) => api.patch<Church>("/church", v),
  /** presign -> direct upload -> returns the object key to send with PATCH /church. */
  uploadLogo: async (file: File, signal?: AbortSignal) => {
    const presigned = await api.post<PresignedUpload>("/church/logo/presign", {
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
    await uploadToSignedUrl(presigned, file, () => undefined, signal);
    return presigned.objectKey;
  },
};
