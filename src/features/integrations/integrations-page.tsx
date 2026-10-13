"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { INTEGRATION_META } from "@/constants/content";
import { ApiError } from "@/services/api-client";
import { integrationService } from "@/services/integration.service";
import type { IntegrationProvider, IntegrationStatus } from "@/types";

const ICONS: Record<IntegrationProvider, LucideIcon> = { WHATSAPP: MessageCircle, EMAIL: Mail };
const STATUS: Record<IntegrationStatus, { label: string; tone: BadgeTone }> = {
  NOT_CONNECTED: { label: "Not connected", tone: "muted" },
  CONNECTED: { label: "Connected", tone: "success" },
  NEEDS_ATTENTION: { label: "Needs attention", tone: "warning" },
};

export function IntegrationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["integrations"], queryFn: ({ signal }) => integrationService.list(signal) });
  const act = useMutation({
    mutationFn: async ({ provider, connect }: { provider: IntegrationProvider; connect: boolean }) => {
      if (!connect) return void (await integrationService.disconnect(provider));
      // The backend owns provider OAuth; we only follow the URL it hands back.
      const { authorizationUrl } = await integrationService.connect(provider);
      if (authorizationUrl) window.location.assign(authorizationUrl);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong."),
  });

  return (
    <>
      <PageHeader title="Integrations" description="Connect messaging and email for your community." />
      <p className="mb-4 rounded-md border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground">
        Looking for Facebook, Instagram, TikTok, YouTube, X or LinkedIn? Those now live in{" "}
        <Link href="/social-accounts" className="font-medium text-accent hover:underline">Social Accounts</Link>.
      </p>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {q.isPending
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)
            : q.data.map((i) => {
                const meta = INTEGRATION_META[i.provider];
                const Icon = ICONS[i.provider];
                const connected = i.status !== "NOT_CONNECTED";
                const pending = act.isPending && act.variables?.provider === i.provider;
                return (
                  <div key={i.provider} className="flex flex-col rounded-lg border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-10 items-center justify-center rounded-md bg-muted"><Icon className="size-5" aria-hidden /></div>
                      <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
                    </div>
                    <h2 className="mt-4 font-medium">{meta.name}</h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">{i.accountLabel ?? meta.description}</p>
                    <div className="mt-4">
                      <Button variant={connected ? "outline" : "primary"} size="sm" loading={pending} onClick={() => act.mutate({ provider: i.provider, connect: i.status === "NEEDS_ATTENTION" || !connected })}>
                        {i.status === "NEEDS_ATTENTION" ? "Reconnect" : connected ? "Connected" : "Connect"}
                      </Button>
                      {connected && (
                        <Button variant="ghost" size="sm" className="ml-1" onClick={() => act.mutate({ provider: i.provider, connect: false })}>Disconnect</Button>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      )}
    </>
  );
}
