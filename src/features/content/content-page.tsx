"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTENT_TYPE_META } from "@/constants/content";
import { useSermons } from "@/features/sermons/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ContentStatus, ContentType } from "@/types";
import { ContentTable } from "./content-table";
import { useContentList } from "./queries";

const TABS: { value: "ALL" | ContentStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PUBLISHED", label: "Published" },
];

export function ContentPage() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"ALL" | ContentStatus>("ALL");
  const [type, setType] = useState("");
  const [sermonId, setSermonId] = useState(params.get("sermonId") ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search);
  const sermons = useSermons({ pageSize: 50 });
  const query = useContentList({
    status: tab === "ALL" ? undefined : tab,
    type: (type || undefined) as ContentType | undefined,
    sermonId: sermonId || undefined,
    q,
    page,
    pageSize: 10,
  });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Content"
        description="Everything Abyde Sermon has drafted from your sermons."
        actions={
          <Button asChild variant="outline">
            <Link href="/sermons">
              <Plus /> Generate from a sermon
            </Link>
          </Button>
        }
      />
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 pt-3">
          <Tabs value={tab} onValueChange={(v) => reset(setTab)(v as typeof tab)}>
            <TabsList className="border-b-0">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-[minmax(0,1fr)_11rem_13rem]">
          <SearchInput value={search} onChange={(e) => reset(setSearch)(e.target.value)} placeholder="Search content…" aria-label="Search content" />
          <Select
            aria-label="Filter by type"
            allowClear
            value={type}
            onValueChange={reset(setType)}
            placeholder="All types"
            options={Object.entries(CONTENT_TYPE_META).map(([value, m]) => ({ value, label: m.label }))}
          />
          <Select
            aria-label="Filter by sermon"
            allowClear
            value={sermonId}
            onValueChange={reset(setSermonId)}
            placeholder="All sermons"
            options={(sermons.data?.items ?? []).map((s) => ({ value: s.id, label: s.title }))}
          />
        </div>
        <div className="border-t border-border">
          <ContentTable
            query={query}
            page={page}
            onPageChange={setPage}
            emptyAction={
              <Button asChild>
                <Link href="/sermons">Choose a sermon</Link>
              </Button>
            }
          />
        </div>
      </div>
    </>
  );
}
