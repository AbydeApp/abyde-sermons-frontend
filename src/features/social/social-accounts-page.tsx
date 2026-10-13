"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORMS, PLATFORM_ORDER } from "@/constants/brand";
import { ApiError } from "@/services/api-client";
import type { SocialConnection, SocialPlatform } from "@/types";
import { formatDate, initials } from "@/utils/format";
import { PlatformGlyph } from "./status";
import { useConnectionActions, useConnections } from "./queries";
import { useQueryClient } from "@tanstack/react-query";
import { socialKeys } from "./queries";

const STATUS: Record<SocialConnection["status"], { label: string; tone: BadgeTone }> = {
  connected: { label: "Connected", tone: "success" },
  expired: { label: "Authorization expired", tone: "warning" },
  revoked: { label: "Access revoked", tone: "danger" },
  error: { label: "Needs attention", tone: "danger" },
};

export function SocialAccountsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const q = useConnections();
  const { connect, reconnect, disconnect } = useConnectionActions();
  const [toDisconnect, setToDisconnect] = useState<SocialConnection | null>(null);
  const handled = useRef(false);

  // OAuth callback lands here as ?connected=<provider> or ?error=<message>.
  useEffect(() => {
    if (handled.current) return;
    const connected = params.get("connected");
    const error = params.get("error");
    if (!connected && !error) return;
    handled.current = true;
    if (error) toast.error(error);
    else toast.success(`${connected![0].toUpperCase()}${connected!.slice(1)} connected`);
    qc.invalidateQueries({ queryKey: socialKeys.connections });
    router.replace("/social-accounts");
  }, [params, qc, router]);

  const onError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
  const follow = (res: { authorizationUrl: string }) => window.location.assign(res.authorizationUrl);

  return (
    <>
      <PageHeader title="Social Accounts" description="Connect the places you publish. We never see your passwords — you authorize each account with the platform itself." />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {q.isPending
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)
            : PLATFORM_ORDER.map((platform: SocialPlatform) => {
                const meta = PLATFORMS[platform];
                const conns = q.data.filter((c) => c.platform === platform);
                const pending = connect.isPending && connect.variables === meta.provider;
                return (
                  <section key={platform} aria-labelledby={`sa-${platform}`} className="flex flex-col rounded-lg border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <PlatformGlyph platform={platform} className="size-9 rounded-md text-xs" />
                      <div className="min-w-0">
                        <h2 id={`sa-${platform}`} className="font-medium">{meta.label}</h2>
                        {(platform === "facebook" || platform === "instagram") && <p className="text-xs text-muted-foreground">Connects through Meta</p>}
                      </div>
                    </div>

                    {conns.length === 0 ? (
                      <>
                        <p className="mt-4 flex-1 text-[13px] text-muted-foreground">Not connected</p>
                        <Button className="mt-4 self-start" size="sm" loading={pending} onClick={() => connect.mutate(meta.provider, { onSuccess: follow, onError })}>
                          Connect
                        </Button>
                      </>
                    ) : (
                      <ul className="mt-4 flex-1 space-y-3">
                        {conns.map((c) => (
                          <li key={c.id} className="space-y-2">
                            <div className="flex items-center gap-2.5">
                              {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar */}
                              {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="size-8 rounded-full" /> : <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">{initials(c.accountName.replace("@", ""))}</span>}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{c.accountName}</p>
                                <p className="text-xs text-muted-foreground">Connected {formatDate(c.connectedAt, "MMM d, yyyy")}</p>
                              </div>
                              <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                            </div>
                            <div className="flex gap-2">
                              {c.status !== "connected" && (
                                <Button size="sm" loading={reconnect.isPending && reconnect.variables === c.id} onClick={() => reconnect.mutate(c.id, { onSuccess: follow, onError })}>
                                  Reconnect
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setToDisconnect(c)}>
                                Disconnect
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
        </div>
      )}
      <p className="mt-6 text-[13px] text-muted-foreground">
        Connected accounts appear as options when you publish from the{" "}
        <Link href="/content" className="font-medium text-accent hover:underline">content editor</Link> or schedule from the{" "}
        <Link href="/calendar" className="font-medium text-accent hover:underline">calendar</Link>.
      </p>
      <ConfirmDialog
        open={!!toDisconnect}
        onOpenChange={(o) => !o && setToDisconnect(null)}
        title={`Disconnect ${toDisconnect ? PLATFORMS[toDisconnect.platform].label : ""}?`}
        description="Scheduled posts to this account will fail until you reconnect it."
        confirmLabel="Disconnect"
        loading={disconnect.isPending}
        onConfirm={() =>
          toDisconnect &&
          disconnect.mutate(toDisconnect.id, {
            onSuccess: () => {
              toast.success("Disconnected");
              setToDisconnect(null);
            },
            onError,
          })
        }
      />
    </>
  );
}
