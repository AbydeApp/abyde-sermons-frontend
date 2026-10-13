import { api } from "./api-client";
import type { AnalyticsSummary } from "@/types";

export const analyticsService = {
  summary: (signal?: AbortSignal) => api.get<AnalyticsSummary>("/analytics", { signal }),
};
