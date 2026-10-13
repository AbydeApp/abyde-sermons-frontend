"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ContentTable } from "@/features/content/content-table";
import { useCalendarRange, useContentList } from "@/features/content/queries";
import { GenerateWeekDialog } from "@/features/sermons/generate-week-dialog";
import { useDashboard } from "@/features/sermons/queries";
import { PageHeader } from "@/components/shared/page-header";
import { ContentCard, StatCard } from "@/components/shared/cards";
import { SermonStatusBadge, TypeBadge } from "@/components/shared/badges";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/utils/cn";
import { firstName, formatDate, greeting } from "@/utils/format";
import { fromLagosWall, toLagosWall } from "@/utils/lagos";

export function DashboardPage() {
  const { data: session } = useSession();
  const dash = useDashboard();
  const [generateOpen, setGenerateOpen] = useState(false);
  const week = useMemo(() => {
    // Weeks run Monday–Sunday in Lagos time; the API takes UTC instants.
    const start = startOfWeek(toLagosWall(new Date()), { weekStartsOn: 1 });
    return { start, days: Array.from({ length: 7 }, (_, i) => addDays(start, i)) };
  }, []);
  const schedule = useCalendarRange(fromLagosWall(week.start).toISOString(), fromLagosWall(addDays(week.start, 7)).toISOString());
  const recent = useContentList({ page: 1, pageSize: 5 });
  const latest = dash.data?.latestSermon;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(session?.user.fullName)}`}
        description="Turn Sunday's message into a week of ministry."
        actions={
          <Button asChild>
            <Link href="/sermons/new">
              <Plus /> New Sermon
            </Link>
          </Button>
        }
      />

      {dash.isError ? (
        <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Sermons This Month" value={dash.data?.sermonsThisMonth} loading={dash.isPending} />
            <StatCard label="Content Generated" value={dash.data?.contentGenerated} loading={dash.isPending} />
            <StatCard label="Scheduled" value={dash.data?.scheduled} loading={dash.isPending} />
            <StatCard label="Published" value={dash.data?.published} loading={dash.isPending} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <ContentCard title="Latest Sermon">
              {dash.isPending ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-40" />
                </div>
              ) : latest ? (
                <div className="p-4">
                  <Link href={`/sermons/${latest.id}`} className="font-serif text-2xl leading-tight hover:text-accent">
                    {latest.title}
                  </Link>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {latest.speaker} · {formatDate(latest.sermonDate)}
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-[13px]">
                    Processing: <SermonStatusBadge status={latest.status} />
                  </p>
                  <Button className="mt-5" disabled={latest.status !== "READY"} onClick={() => setGenerateOpen(true)}>
                    <Sparkles /> Generate My Week
                  </Button>
                  {latest.status !== "READY" && (
                    <p className="mt-2 text-xs text-muted-foreground">Available once processing is complete.</p>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="Your sermon library starts here."
                  description="Upload your first message and Abyde Sermon will turn it into a week of ministry content."
                  action={
                    <Button asChild>
                      <Link href="/sermons/new">Upload First Sermon</Link>
                    </Button>
                  }
                />
              )}
            </ContentCard>

            <ContentCard title="This Week" description={`${format(week.days[0], "MMM d")} – ${format(week.days[6], "MMM d")} · WAT`}>
              {schedule.isError ? (
                <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} className="py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {week.days.map((day) => {
                    const items = schedule.data?.filter((c) => isSameDay(toLagosWall(c.scheduledAt), day)) ?? [];
                    const today = isSameDay(day, toLagosWall(new Date()));
                    return (
                      <li key={day.toISOString()} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-16 shrink-0">
                          <p className={cn("text-xs font-medium uppercase tracking-wide", today ? "text-accent" : "text-muted-foreground")}>
                            {format(day, "EEE")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{format(day, "MMM d")}</p>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1">
                          {schedule.isPending ? (
                            <Skeleton className="h-4 w-40" />
                          ) : items.length ? (
                            items.map((c) => (
                              <Link key={c.id} href={`/content/${c.contentItemId}`} className="flex min-w-0 items-center gap-2 text-[13px] hover:text-accent">
                                <TypeBadge type={c.content.type} />
                                <span className="max-w-40 truncate text-muted-foreground">{c.content.title}</span>
                              </Link>
                            ))
                          ) : (
                            <span className="text-[13px] text-muted-foreground/70">Nothing scheduled</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ContentCard>
          </div>

          <ContentCard
            title="Recent Content"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/content">View all</Link>
              </Button>
            }
          >
            <ContentTable query={recent} compact />
          </ContentCard>
        </div>
      )}

      {latest && <GenerateWeekDialog sermonId={latest.id} sermonTitle={latest.title} open={generateOpen} onOpenChange={setGenerateOpen} />}
    </>
  );
}
