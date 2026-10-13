"use client";

import { ArrowDown, ArrowUp, Download, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandPreview } from "@/components/brand/brand-preview";
import { ContentCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { TEMPLATE_CATEGORIES } from "@/constants/brand";
import { useContentMutations, useRenderFlow } from "@/features/content/queries";
import { PublishPanel } from "@/features/social/publish-panel";
import { ApiError } from "@/services/api-client";
import type { BrandProfile, CarouselContent, CarouselSlide, ContentItem, ContentTemplate } from "@/types";
import { cn } from "@/utils/cn";
import { downloadUrl, slug } from "@/utils/download";
import { TemplatePicker, extFor } from "./shared";

export function CarouselBuilder({ content, brand, templates }: { content: ContentItem; brand: BrandProfile; templates: ContentTemplate[] }) {
  const saved = content.structured!.carousel!;
  const list = templates.filter((t) => t.category === "CAROUSEL");
  const meta = TEMPLATE_CATEGORIES.find((c) => c.value === "CAROUSEL")!;
  const [slides, setSlides] = useState<CarouselSlide[]>(saved.slides);
  const [cta, setCta] = useState(saved.cta ?? "");
  const [selected, setSelected] = useState(0);
  const [templateId, setTemplateId] = useState((list.find((t) => t.isDefault) ?? list[0])?.id);
  const mutations = useContentMutations(content.id);
  const flow = useRenderFlow(content.id);

  const dirty = JSON.stringify({ slides, cta: cta || undefined }) !== JSON.stringify({ slides: saved.slides, cta: saved.cta || undefined });
  const variant = list.find((t) => t.id === templateId)?.variant ?? "bold";
  const current = slides[selected];
  const ready = content.visual?.status === "READY" && content.visual.assets.length === slides.length && !dirty;
  const bg = brand.assets.find((a) => a.kind === "PORTRAIT")?.url;

  const patchSlide = (i: number, p: Partial<CarouselSlide>) => setSlides((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= slides.length) return;
    setSlides((s) => {
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSelected(j);
  };
  const remove = (i: number) => {
    setSlides((s) => s.filter((_, j) => j !== i));
    setSelected((sel) => Math.max(0, Math.min(sel, slides.length - 2)));
  };

  function save() {
    const carousel: CarouselContent = { title: saved.title, slides, cta: cta || undefined };
    mutations.save.mutate(
      { structured: { carousel } },
      { onSuccess: () => toast.success("Carousel saved"), onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't save.") },
    );
  }

  async function exportAll() {
    try {
      const item = dirty || content.visual?.status !== "READY" ? await flow.run({ templateId, format: "carousel-slide" }) : content;
      const assets = item.visual!.assets;
      for (let i = 0; i < assets.length; i++) {
        downloadUrl(assets[i].url, `${slug(content.title)}-slide-${i + 1}.${extFor(assets[i].url)}`);
        await new Promise((r) => setTimeout(r, 250));
      }
      toast.success(`Exported ${assets.length} slides`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't export the slides.");
    }
  }

  if (!current) return null;
  const label = slides.length ? `Slide ${selected + 1} of ${slides.length}` : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0 space-y-5">
        <ContentCard title="Slides" description="Select a slide to edit it. Use the arrows to reorder." bodyClassName="p-3">
          <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Slide navigator">
            {slides.map((s, i) => (
              <li key={i} className="w-24 shrink-0">
                <button type="button" onClick={() => setSelected(i)} aria-current={i === selected} aria-label={`Slide ${i + 1}: ${s.title ?? s.body}`} className={cn("block w-full rounded-md border p-0.5", i === selected ? "border-accent ring-2 ring-accent/25" : "border-border")}>
                  <BrandPreview brand={brand} variant={variant} format="carousel-slide" headline={(s.title || s.body).slice(0, 40)} className="pointer-events-none" backgroundUrl={bg} />
                </button>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{i + 1}</span>
                  <span className="flex">
                    <Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Move slide ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-3 -rotate-90" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Move slide ${i + 1} later`} disabled={i === slides.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-3 -rotate-90" /></Button>
                  </span>
                </div>
              </li>
            ))}
            <li className="w-24 shrink-0">
              <button type="button" onClick={() => { setSlides((s) => [...s, { title: "", body: "New slide" }]); setSelected(slides.length); }} className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong text-xs text-muted-foreground hover:bg-muted">
                <Plus className="size-4" /> Add
              </button>
            </li>
          </ol>
        </ContentCard>

        <ContentCard title={`Edit slide ${selected + 1}`} bodyClassName="space-y-4 p-4">
          <Field label="Slide title" htmlFor="cb-title" optional>
            <Input id="cb-title" value={current.title ?? ""} onChange={(e) => patchSlide(selected, { title: e.target.value })} />
          </Field>
          <Field label="Slide text" htmlFor="cb-body">
            <Textarea id="cb-body" value={current.body} onChange={(e) => patchSlide(selected, { body: e.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={dirty}
              title={dirty ? "Save your changes first" : undefined}
              loading={mutations.regenerateSlide.isPending}
              onClick={() =>
                mutations.regenerateSlide.mutate(selected, {
                  onSuccess: (u) => {
                    setSlides(u.structured!.carousel!.slides);
                    toast.success("Slide regenerated");
                  },
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't regenerate the slide."),
                })
              }
            >
              <RefreshCw /> Regenerate this slide
            </Button>
            <Button variant="ghost" size="sm" disabled={slides.length <= 1} onClick={() => remove(selected)}>
              <Trash2 /> Remove slide
            </Button>
          </div>
          {dirty && <p className="text-xs text-muted-foreground">Unsaved changes. Saving creates a new version of this content and returns it to Draft.</p>}
          <Field label="Closing call to action" htmlFor="cb-cta" optional>
            <Input id="cb-cta" value={cta} onChange={(e) => setCta(e.target.value)} />
          </Field>
        </ContentCard>

        <ContentCard title="Template" description={`${meta.label} templates`} bodyClassName="p-4">
          <TemplatePicker templates={list} value={templateId} onChange={setTemplateId} brand={brand} format="carousel-slide" headline={(current.title || current.body).slice(0, 40)} label="Notes" background={bg} />
        </ContentCard>

        <div id="publish" className="scroll-mt-20">
          <PublishPanel content={ready ? content : { ...content, visual: content.visual?.status === "RENDERING" ? content.visual : null }} />
        </div>
      </div>

      <aside>
        <div className="sticky top-20 space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Preview</h2>
          <BrandPreview brand={brand} variant={variant} format="carousel-slide" headline={current.title || current.body} body={current.title ? current.body : undefined} label="Notes" slideLabel={label} backgroundUrl={bg} />
          <p className="text-center text-xs text-muted-foreground">{label}</p>
          <Button className="w-full" onClick={save} disabled={!dirty} loading={mutations.save.isPending}>
            Save carousel
          </Button>
          <Button className="w-full" variant="outline" onClick={exportAll} loading={flow.busy} disabled={dirty}>
            <Download /> Generate &amp; export all slides
          </Button>
          <p role="status" className="text-xs text-muted-foreground">
            {flow.busy || content.visual?.status === "RENDERING" ? "Rendering slides…" : ready ? `${content.visual!.assets.length} slides rendered.` : "Render to publish this carousel."}
          </p>
        </div>
      </aside>
    </div>
  );
}
