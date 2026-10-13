"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronDown, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ApiError } from "@/services/api-client";
import { useDeleteContent, useDeleteContentBatch } from "./queries";
import { StatusBadge, TypeBadge } from "@/components/shared/badges";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/shared/states";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ContentItem, Paginated } from "@/types";
import { CONTENT_TYPE_META } from "@/constants/content";
import { groupContent } from "./group-content";
import { formatDateTime } from "@/utils/format";

function RowActions({ item }: { item: ContentItem }) {
  const [confirm, setConfirm] = useState(false);
  const del = useDeleteContent();
  const locked = item.status === "PUBLISHED";
  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${item.title}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href={`/content/${item.id}`}>
            <Pencil /> Open &amp; edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/sermons/${item.sermonId}`}>
            <FileText /> View sermon
          </Link>
        </DropdownMenuItem>
        {!locked && (
          <DropdownMenuItem destructive onSelect={() => setConfirm(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <ConfirmDialog
      open={confirm}
      onOpenChange={setConfirm}
      title="Delete this content?"
      description={`“${item.title}” will be removed, including any scheduled time.`}
      loading={del.isPending}
      onConfirm={() =>
        del.mutate(item.id, {
          onSuccess: () => {
            toast.success("Content deleted");
            setConfirm(false);
          },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't delete."),
        })
      }
    />
    </>
  );
}

export function ContentTable({
  query,
  compact,
  grouped = false,
  page,
  onPageChange,
  emptyAction,
}: {
  query: UseQueryResult<Paginated<ContentItem>>;
  compact?: boolean;
  grouped?: boolean;
  page?: number;
  onPageChange?: (p: number) => void;
  emptyAction?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);
  const batch = useDeleteContentBatch();
  const groups = groupContent(query.data?.items ?? []);
  const groupPageSize = 10;
  const currentPage = grouped ? Math.min(page ?? 1, Math.max(1, Math.ceil(groups.length / groupPageSize))) : page ?? 1;
  const visibleGroups = groups.slice((currentPage - 1) * groupPageSize, currentPage * groupPageSize);
  const visibleItems = grouped ? visibleGroups.flatMap((group) => group.items) : query.data?.items ?? [];
  const selectable = visibleItems.filter((item) => item.status !== "PUBLISHED");
  const selectedIds = selectable.filter((item) => selected.has(item.id)).map((item) => item.id);
  const selectionDisabled = batch.isPending || query.isFetching;
  const allSelected = selectable.length > 0 && selectedIds.length === selectable.length;
  function toggle(id: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  const selectAll = <Checkbox aria-label="Select all on this page" disabled={selectionDisabled || !selectable.length} checked={allSelected ? true : selectedIds.length ? "indeterminate" : false} onCheckedChange={(checked) => setSelected(new Set(checked === true ? selectable.map((item) => item.id) : []))} />;
  const selectItem = (item: ContentItem) => <Checkbox aria-label={`Select ${item.title}`} disabled={selectionDisabled || item.status === "PUBLISHED"} checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => toggle(item.id, checked === true)} />;

  if (query.isPending) return <RowsSkeleton rows={compact ? 3 : 6} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const { items, total, pageSize } = query.data;
  if (!items.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No content yet."
        description="Generate your first week from one of your sermons."
        action={emptyAction}
      />
    );
  }

  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <label className="flex items-center gap-2 text-sm">{selectAll}Select all on this page</label>
          <span className="text-sm text-muted-foreground" aria-live="polite">{selectedIds.length} selected</span>
          {selectedIds.length > 0 && <>
            <Button size="sm" variant="ghost" disabled={batch.isPending} onClick={() => setSelected(new Set())}>Clear selection</Button>
            <Button size="sm" variant="danger" className="ml-auto" disabled={selectionDisabled} onClick={() => setConfirmBatch(true)}><Trash2 />Delete selected</Button>
          </>}
        </div>
      )}
      <ConfirmDialog
        open={confirmBatch}
        onOpenChange={(open) => { if (!batch.isPending) setConfirmBatch(open); }}
        title={`Delete ${selectedIds.length} selected ${selectedIds.length === 1 ? "item" : "items"}?`}
        description="These items and their scheduled times will be removed. This cannot be undone."
        confirmLabel="Delete selected"
        loading={batch.isPending}
        onConfirm={() => batch.mutate(selectedIds, { onSuccess: ({ deleted, failed }) => {
          setSelected(new Set(failed));
          setConfirmBatch(false);
          if (deleted.length) toast.success(`${deleted.length} ${deleted.length === 1 ? "item" : "items"} deleted`);
          if (failed.length) toast.error(`${failed.length} ${failed.length === 1 ? "item couldn’t" : "items couldn’t"} be deleted. They remain selected so you can retry.`);
          const remainingItems = (query.data?.items ?? []).filter((item) => !deleted.includes(item.id));
          const remaining = grouped ? groupContent(remainingItems).length : (query.data?.total ?? 0) - deleted.length;
          const size = grouped ? groupPageSize : query.data?.pageSize ?? 10;
          if (currentPage > 1 && remaining <= (currentPage - 1) * size) onPageChange?.(Math.max(1, Math.ceil(remaining / size)));
        } })}
      />
      {grouped ? (
        <div className="divide-y divide-border">
          <p className="bg-muted/40 px-4 py-2 text-xs text-muted-foreground">Grouped by sermon and content type · {groups.length} groups · {total} items</p>
          {visibleGroups.map((group) => {
            const deletable = group.items.filter((item) => item.status !== "PUBLISHED");
            const count = deletable.filter((item) => selected.has(item.id)).length;
            const statuses = [...new Set(group.items.map((item) => item.status))];
            return (
              <div key={group.id} className="relative">
                <Checkbox className="absolute left-4 top-5 z-10" aria-label={`Select group: ${group.sermonTitle}, ${CONTENT_TYPE_META[group.type].label}`} disabled={selectionDisabled || !deletable.length} checked={deletable.length > 0 && count === deletable.length ? true : count ? "indeterminate" : false} onCheckedChange={(checked) => setSelected((previous) => {
                  const next = new Set(previous);
                  for (const item of deletable) { if (checked === true) next.add(item.id); else next.delete(item.id); }
                  return next;
                })} />
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 py-4 pl-12 pr-4 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-transform group-open:rotate-0" aria-hidden />
                    <span className="min-w-0 flex-1"><span className="block font-medium">{group.sermonTitle}</span><span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><TypeBadge type={group.type} /><span>{group.items.length} {group.items.length === 1 ? "item" : "items"}</span></span></span>
                    <span className="flex flex-wrap justify-end gap-1">{statuses.map((status) => <StatusBadge key={status} status={status} />)}</span>
                  </summary>
                  <ul className="divide-y divide-border border-t border-border bg-muted/20">
                    {group.items.map((item) => <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:pl-12">{selectItem(item)}<div className="min-w-0 flex-1"><Link href={`/content/${item.id}`} className="block font-medium hover:text-accent">{item.title}</Link><span className="text-xs text-muted-foreground">{formatDateTime(item.scheduledAt ?? item.updatedAt)}</span></div><StatusBadge status={item.status} /><RowActions item={item} /></li>)}
                  </ul>
                </details>
              </div>
            );
          })}
        </div>
      ) : <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {!compact && <TableHead className="w-10"><span className="sr-only">Select content</span></TableHead>}
              <TableHead>Content</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source Sermon</TableHead>
              <TableHead>{compact ? "Scheduled For" : "Date"}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                {!compact && <TableCell className="w-10">{selectItem(c)}</TableCell>}
                <TableCell className="max-w-64">
                  <Link href={`/content/${c.id}`} className="block truncate font-medium hover:text-accent">
                    {c.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <TypeBadge type={c.type} />
                </TableCell>
                <TableCell className="max-w-44 truncate text-muted-foreground">{c.sermonTitle}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(compact ? c.scheduledAt : (c.scheduledAt ?? c.updatedAt))}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-right">
                  <RowActions item={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {items.map((c) => (
          <li key={c.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              {!compact && selectItem(c)}
              <Link href={`/content/${c.id}`} className="font-medium hover:text-accent">
                {c.title}
              </Link>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <TypeBadge type={c.type} />
              <span>{c.sermonTitle}</span>
              <span>{formatDateTime(c.scheduledAt ?? c.updatedAt)}</span>
            </div>
          </li>
        ))}
      </ul>

      </>}
      {!compact && page && onPageChange && <Pagination page={currentPage} pageSize={grouped ? groupPageSize : pageSize} total={grouped ? groups.length : total} onPageChange={onPageChange} />}
    </div>
  );
}
