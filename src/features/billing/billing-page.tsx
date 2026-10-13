"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/shared/cards";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/services/api-client";
import { billingService } from "@/services/billing.service";
import { formatDate } from "@/utils/format";

export function BillingPage() {
  const q = useQuery({ queryKey: ["billing"], queryFn: ({ signal }) => billingService.get(signal) });
  const portal = useMutation({
    mutationFn: billingService.portal,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't open billing."),
  });

  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const b = q.data;
  const pct = b ? Math.min(100, Math.round((b.sermonsUsed / b.sermonsLimit) * 100)) : 0;

  return (
    <>
      <PageHeader title="Billing" description="Your plan and how much of it you've used this month." />
      <div className="grid gap-5 lg:grid-cols-2">
        <ContentCard title="Current plan" bodyClassName="p-5">
          {!b ? <Skeleton className="h-20" /> : (
            <>
              <div className="flex items-baseline justify-between">
                <p className="font-serif text-3xl">{b.plan.name}</p>
                <Badge tone="accent">{b.plan.priceLabel}</Badge>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">Renews on {formatDate(b.renewalDate, "MMMM d, yyyy")}</p>
              <Button className="mt-5" variant="outline" loading={portal.isPending} onClick={() => portal.mutate()}>Upgrade or change plan</Button>
            </>
          )}
        </ContentCard>
        <ContentCard title="Usage this month" bodyClassName="p-5">
          {!b ? <Skeleton className="h-20" /> : (
            <>
              <p className="text-sm font-medium">{b.sermonsUsed} of {b.sermonsLimit} sermons used this month</p>
              <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Sermons used" className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{b.contentGenerated} content pieces generated</p>
            </>
          )}
        </ContentCard>
      </div>
    </>
  );
}
