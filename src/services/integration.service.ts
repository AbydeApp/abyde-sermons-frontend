import { api } from "./api-client";
import type { Integration, IntegrationProvider } from "@/types";

export const integrationService = {
  list: (signal?: AbortSignal) => api.get<Integration[]>("/integrations", { signal }),
  /** The API starts the provider OAuth flow; secrets stay server-side. */
  connect: (provider: IntegrationProvider) => api.post<{ authorizationUrl: string }>(`/integrations/${provider}/connect`),
  disconnect: (provider: IntegrationProvider) => api.delete<void>(`/integrations/${provider}`),
};
