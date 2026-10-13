"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { StatCard, ContentCard } from "@/components/shared/cards";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { analyticsService } from "@/services/analytics.service";

export function AnalyticsPage() {
  const q = useQuery({ queryKey: ["analytics"], queryFn: ({ signal }) => analyticsService.summary(signal) });
  return (
    <>
      <PageHeader title="Analytics" description="How your ministry content is moving from sermon to published." />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Sermons Uploaded" value={q.data?.sermonsUploaded} loading={q.isPending} />
            <StatCard label="Content Generated" value={q.data?.contentGenerated} loading={q.isPending} />
            <StatCard label="Content Approved" value={q.data?.contentApproved} loading={q.isPending} />
            <StatCard label="Content Scheduled" value={q.data?.contentScheduled} loading={q.isPending} />
            <StatCard label="Content Published" value={q.data?.contentPublished} loading={q.isPending} />
          </div>
          {q.data && !q.data.publishingMetrics && (
            <ContentCard title="Reach & engagement">
              <EmptyState
                icon={BarChart3}
                title="Reach and engagement will appear here."
                description="Once you publish content through a connected channel, we'll show how it's performing."
              />
            </ContentCard>
          )}
        </div>
      )}
    </>
  );
}
