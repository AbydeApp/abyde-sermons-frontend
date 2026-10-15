"use client";

import { BookOpen, MoreHorizontal, Pencil, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScriptureBadge, SermonStatusBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SermonCard } from "@/components/shared/sermon-card";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/services/api-client";
import type { Sermon, SermonStatusGroup } from "@/types";
import { formatDate } from "@/utils/format";
import { useLibrary } from "@/features/library/queries";
import { useDeleteSermon, useSermons } from "./queries";
import { SermonFilters, filterParams, hasFilters, type Filters } from "./sermon-filters";

const TABS: { value: "ALL" | SermonStatusGroup; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "FAILED", label: "Failed" },
];

export function SermonsPage() {
  const [tab, setTab] = useState<"ALL" | SermonStatusGroup>("ALL");
  const [search, setSearch] = useState(useSearchParams().get("q") ?? "");
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search);
  // Searching or filtering uses the library endpoints (meaning-based, finished sermons only);
  // otherwise the plain list with status tabs.
  const searching = q.trim() !== "" || hasFilters(filters);
  const list = useSermons({ group: tab === "ALL" ? undefined : tab, page, pageSize: 8 }, !searching);
  const found = useLibrary({ q, ...filterParams(filters), page, pageSize: 8 }, searching);
  const query = searching ? found : list;
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const changeFilters = (next: Filters) => { setFilters(next); setPage(1); };
  const [toDelete, setToDelete] = useState<Sermon | null>(null);
  const del = useDeleteSermon();

  const newBtn = (
    <Button asChild>
      <Link href="/sermons/new">
        <Plus /> New Sermon
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="Sermons" actions={newBtn} />
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setPage(1); }}>
            <TabsList className="border-b-0">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} disabled={searching}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Try “sermons about fear”"
              aria-label="Search sermons"
              className="w-full sm:w-64"
            />
            <Button variant="outline" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
              <SlidersHorizontal /> Filters{activeFilters > 0 && ` (${activeFilters})`}
            </Button>
          </div>
        </div>
        {(showFilters || activeFilters > 0) && (
          <div className="space-y-2 px-4 pt-3">
            <SermonFilters value={filters} onChange={changeFilters} />
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={() => changeFilters({})}>
                <X /> Clear filters
              </Button>
            )}
          </div>
        )}
        {searching && <p className="px-4 pt-3 text-xs text-muted-foreground">Searching your finished sermons. Clear the search and filters to see every status.</p>}
        <div className="mt-3 border-t border-border">
          {query.isPending ? (
            <RowsSkeleton rows={6} />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : query.data.items.length === 0 ? (
            searching || tab !== "ALL" ? (
              <EmptyState icon={BookOpen} title="No sermons found." description="Try different words or clear your filters." />
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Your sermon library starts here."
                description="Upload your first message and Abyde Sermon will turn it into a week of ministry content."
                action={<Button asChild><Link href="/sermons/new">Upload First Sermon</Link></Button>}
              />
            )
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Title</TableHead>
                      <TableHead>Speaker</TableHead>
                      <TableHead>Main Scripture</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Content Generated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20 text-right"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.data.items.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="max-w-56">
                          <Link href={`/sermons/${s.id}`} className="block truncate font-medium hover:text-accent">{s.title}</Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.speaker}</TableCell>
                        <TableCell>{s.mainScripture ? <ScriptureBadge reference={s.mainScripture} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(s.sermonDate, "MMM d, yyyy")}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{s.contentCount}</TableCell>
                        <TableCell><SermonStatusBadge status={s.status} /></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${s.title}`}><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem asChild><Link href={`/sermons/${s.id}`}><BookOpen /> Open</Link></DropdownMenuItem>
                              <DropdownMenuItem asChild><Link href={`/sermons/${s.id}?edit=1`}><Pencil /> Edit details</Link></DropdownMenuItem>
                              <DropdownMenuItem destructive onSelect={() => setToDelete(s)}><Trash2 /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="space-y-3 p-4 md:hidden">
                {query.data.items.map((s) => (
                  <li key={s.id}><SermonCard sermon={s} /></li>
                ))}
              </ul>
              <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this sermon?"
        description={`“${toDelete?.title}” and all content generated from it will be permanently removed.`}
        loading={del.isPending}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success("Sermon deleted");
              setToDelete(null);
            },
            onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't delete the sermon."),
          })
        }
      />
    </>
  );
}
