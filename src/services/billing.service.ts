import { api } from "./api-client";
import type { BillingInfo } from "@/types";

interface Subscription {
  planId: string;
  planName: string;
  priceLabel: string;
  status: string;
  currentPeriodEnd: string;
}
interface Usage {
  sermonsUsed: number;
  sermonsLimit: number;
  contentGenerated: number;
  periodEnd: string;
}

export const billingService = {
  get: async (signal?: AbortSignal): Promise<BillingInfo> => {
    const [sub, usage] = await Promise.all([
      api.get<Subscription>("/billing/subscription", { signal }),
      api.get<Usage>("/billing/usage", { signal }),
    ]);
    return {
      plan: { id: sub.planId, name: sub.planName, priceLabel: sub.priceLabel },
      status: sub.status,
      sermonsUsed: usage.sermonsUsed,
      sermonsLimit: usage.sermonsLimit,
      contentGenerated: usage.contentGenerated,
      renewalDate: sub.currentPeriodEnd,
    };
  },
  /** Returns a hosted portal URL; card data never touches this app. */
  portal: () => api.post<{ url: string }>("/billing/portal"),
};
