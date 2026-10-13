"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ApiError } from "@/services/api-client";
import { useDeleteContent } from "./queries";
import { StatusBadge, TypeBadge } from "@/components/shared/badges";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ContentItem, Paginated } from "@/types";
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
  page,
  onPageChange,
  emptyAction,
}: {
  query: UseQueryResult<Paginated<ContentItem>>;
  compact?: boolean;
  page?: number;
  onPageChange?: (p: number) => void;
  emptyAction?: React.ReactNode;
}) {
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
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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

      {!compact && page && onPageChange && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />}
    </div>
  );
}
