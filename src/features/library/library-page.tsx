"use client";

import { Library, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SermonCard } from "@/components/shared/sermon-card";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LibraryParams } from "@/services/library.service";
import { useFacets, useLibrary } from "./queries";

type FilterKey = "speaker" | "series" | "scripture" | "theme" | "year" | "tag";
const FILTERS: { key: FilterKey; label: string; facet: "speakers" | "series" | "scriptures" | "themes" | "years" | "tags" }[] = [
  { key: "speaker", label: "Speaker", facet: "speakers" },
  { key: "series", label: "Series", facet: "series" },
  { key: "scripture", label: "Scripture", facet: "scriptures" },
  { key: "theme", label: "Theme", facet: "themes" },
  { key: "year", label: "Year", facet: "years" },
  { key: "tag", label: "Tags", facet: "tags" },
];

export function LibraryPage() {
  const initial = useSearchParams().get("q") ?? "";
  const [search, setSearch] = useState(initial);
  const [filters, setFilters] = useState<Partial<Record<FilterKey, string>>>({});
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search);
  const facets = useFacets();
  const params: LibraryParams = { q, ...filters, page, pageSize: 9 };
  const query = useLibrary(params);
  const active = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader title="Library" description="Search your archive by title, speaker, scripture, theme or what the sermon is about." />
      <SearchInput
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Try “Show me sermons about dealing with fear.”"
        aria-label="Search library"
        className="mb-3 [&_input]:h-11 [&_input]:text-[15px]"
      />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {FILTERS.map((f) => (
          <Select
            key={f.key}
            aria-label={f.label}
            allowClear
            placeholder={f.label}
            value={filters[f.key] ?? ""}
            onValueChange={(v) => { setFilters((p) => ({ ...p, [f.key]: v })); setPage(1); }}
            options={(facets.data?.[f.facet] ?? []).map((v) => ({ value: v, label: v }))}
          />
        ))}
      </div>
      {active && (
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => setFilters({})}>
          <X /> Clear filters
        </Button>
      )}

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          {q || active ? (
            <EmptyState icon={Library} title="No sermons found." description="Try different words or clear your filters." />
          ) : (
            <EmptyState
              icon={Library}
              title="Your library starts with your first sermon."
              description="Once a sermon finishes processing it appears here, searchable by meaning."
              action={<Button asChild><Link href="/sermons/new">Upload First Sermon</Link></Button>}
            />
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.items.map((s) => <SermonCard key={s.id} sermon={s} />)}
          </div>
          <div className="mt-4 rounded-lg border border-border bg-card">
            <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPageChange={setPage} />
          </div>
        </>
      )}
    </>
  );
}
