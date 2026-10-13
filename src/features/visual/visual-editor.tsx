"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { categoryFor } from "@/constants/brand";
import { useBrandProfile, useTemplates } from "@/features/brand-studio/queries";
import { useContentItem } from "@/features/content/queries";
import { ApiError } from "@/services/api-client";
import { CarouselBuilder } from "./carousel-builder";
import { ReelBuilder } from "./reel-builder";
import { SingleVisual } from "./single-visual";
import { FONTS_STYLESHEET } from "@/constants/brand";

export function VisualEditor({ id }: { id: string }) {
  const content = useContentItem(id);
  const brand = useBrandProfile();
  const templates = useTemplates();

  const error = content.error ?? brand.error ?? templates.error;
  if (content.isPending || brand.isPending || templates.isPending) return <LoadingState label="Loading your brand and content…" />;
  if (error || !content.data || !brand.data || !templates.data) {
    return error instanceof ApiError && error.status === 404 ? (
      <EmptyState title="Content not found." action={<Button asChild variant="outline"><Link href="/content">Back to content</Link></Button>} />
    ) : (
      <ErrorState error={error} onRetry={() => { content.refetch(); brand.refetch(); templates.refetch(); }} />
    );
  }

  const c = content.data;
  const category = categoryFor(c.type, { carousel: !!c.structured?.carousel, hasScripture: !!c.scripture });

  return (
    <>
      <link rel="stylesheet" href={FONTS_STYLESHEET} precedence="default" />
      <Link href={`/content/${id}`} className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> Back to content
      </Link>
      <PageHeader title="Create Visual" description={c.title} />
      {!category ? (
        <EmptyState title="Visuals aren't available for this content type." description="Create visuals from quotes, social posts, prayers, devotionals and reel ideas." />
      ) : c.structured?.reel ? (
        <ReelBuilder key={c.id} content={c} brand={brand.data} />
      ) : c.structured?.carousel ? (
        <CarouselBuilder key={c.id} content={c} brand={brand.data} templates={templates.data} />
      ) : (
        <SingleVisual key={c.id} content={c} brand={brand.data} templates={templates.data} />
      )}
    </>
  );
}
