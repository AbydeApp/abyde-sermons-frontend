"use client";

import { Download, Eye, RefreshCw, Send, CalendarClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandPreview } from "@/components/brand/brand-preview";
import { ContentCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FORMATS, FORMAT_ORDER, TEMPLATE_CATEGORIES, categoryFor } from "@/constants/brand";
import { useContentMutations, useRenderFlow } from "@/features/content/queries";
import { PublishPanel } from "@/features/social/publish-panel";
import { ApiError } from "@/services/api-client";
import type { BrandProfile, ContentItem, ContentTemplate, RenderRequest, VisualFormat } from "@/types";
import { downloadUrl, slug } from "@/utils/download";
import { BackgroundPicker, TemplatePicker, extFor } from "./shared";

function initialText(c: ContentItem) {
  if (c.type === "QUOTE") return { headline: c.body.replace(/^“|”$/g, ""), body: "" };
  const body = c.body.replace(/\s+/g, " ");
  return { headline: c.title, body: body.length > 140 ? `${body.slice(0, 137)}…` : body };
}

export function SingleVisual({ content, brand, templates }: { content: ContentItem; brand: BrandProfile; templates: ContentTemplate[] }) {
  const category = categoryFor(content.type, { hasScripture: !!content.scripture })!;
  const meta = TEMPLATE_CATEGORIES.find((c) => c.value === category)!;
  const list = templates.filter((t) => t.category === category);
  const [templateId, setTemplateId] = useState((list.find((t) => t.isDefault) ?? list[0])?.id);
  const [format, setFormat] = useState<VisualFormat>(meta.format);
  const [bgId, setBgId] = useState<string | null>(null);
  const [text, setText] = useState(() => initialText(content));
  const [previewOpen, setPreviewOpen] = useState(false);
  const mutations = useContentMutations(content.id);
  const flow = useRenderFlow(content.id);

  const req: RenderRequest = { templateId, format, backgroundAssetId: bgId, overrides: { headline: text.headline, body: text.body } };
  const sig = JSON.stringify(req);
  const [renderedSig, setRenderedSig] = useState<string | null>(() => (content.visual?.status === "READY" ? sig : null));
  const ready = content.visual?.status === "READY";
  const stale = ready && renderedSig !== sig;

  const variant = list.find((t) => t.id === templateId)?.variant ?? "bold";
  const background = brand.assets.find((a) => a.id === bgId)?.url ?? null;
  const preview = (
    <BrandPreview brand={brand} variant={variant} format={format} headline={text.headline} body={text.body || undefined} label={meta.label} backgroundUrl={background} />
  );

  async function render(thenDownload: boolean) {
    try {
      const item = await flow.run(req);
      setRenderedSig(sig);
      if (thenDownload) {
        const url = item.visual!.assets[0].url;
        downloadUrl(url, `${slug(content.title)}.${extFor(url)}`);
      } else toast.success("Visual rendered");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't render the visual.");
    }
  }

  function download() {
    if (ready && !stale) {
      const url = content.visual!.assets[0].url;
      downloadUrl(url, `${slug(content.title)}.${extFor(url)}`);
    } else void render(true);
  }

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0 space-y-5">
        <ContentCard title="Edit text" description="Changes here only affect this graphic — your content itself is untouched." bodyClassName="space-y-4 p-4">
          <Field label={content.type === "QUOTE" ? "Quote" : "Headline"} htmlFor="vs-headline">
            {content.type === "QUOTE" ? (
              <Textarea id="vs-headline" value={text.headline} onChange={(e) => setText((t) => ({ ...t, headline: e.target.value }))} />
            ) : (
              <Input id="vs-headline" value={text.headline} onChange={(e) => setText((t) => ({ ...t, headline: e.target.value }))} />
            )}
          </Field>
          {content.type !== "QUOTE" && (
            <Field label="Supporting text" htmlFor="vs-body" optional>
              <Textarea id="vs-body" className="min-h-20" value={text.body} onChange={(e) => setText((t) => ({ ...t, body: e.target.value }))} />
            </Field>
          )}
          <Button
            variant="outline"
            size="sm"
            loading={mutations.regenerate.isPending}
            onClick={() =>
              mutations.regenerate.mutate(undefined, {
                onSuccess: (updated) => {
                  setText(initialText(updated));
                  toast.success("Copy regenerated");
                },
                onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't regenerate."),
              })
            }
          >
            <RefreshCw /> Regenerate Copy
          </Button>
        </ContentCard>

        <ContentCard title="Template" description={`${meta.label} templates`} bodyClassName="p-4">
          <TemplatePicker templates={list} value={templateId} onChange={setTemplateId} brand={brand} format={meta.format} headline={text.headline.slice(0, 60)} label={meta.label} background={background} />
        </ContentCard>

        <ContentCard title="Background & size" bodyClassName="space-y-4 p-4">
          <div>
            <p className="mb-1.5 text-[13px] font-medium">Background</p>
            <BackgroundPicker assets={brand.assets} value={bgId} onChange={setBgId} />
          </div>
          <Field label="Size" htmlFor="vs-format" className="max-w-xs">
            <Select id="vs-format" value={format} onValueChange={(v) => setFormat(v as VisualFormat)} options={FORMAT_ORDER.map((f) => ({ value: f, label: `${FORMATS[f].label} · ${FORMATS[f].width}×${FORMATS[f].height}` }))} />
          </Field>
        </ContentCard>

        <div id="publish" className="scroll-mt-20">
          <PublishPanel content={content} />
        </div>
      </div>

      <aside>
        <div className="sticky top-20 space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Preview</h2>
          <div className={format === "story" ? "mx-auto max-w-[15rem]" : undefined}>{preview}</div>
          <p role="status" className="text-xs text-muted-foreground">
            {flow.busy || content.visual?.status === "RENDERING" ? "Rendering…" : stale ? "Settings changed — render again to apply." : ready ? "Rendered and ready to publish." : "Not rendered yet."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye /> Preview
            </Button>
            <Button variant="outline" onClick={download} loading={flow.busy}>
              <Download /> Download
            </Button>
            <Button variant="outline" onClick={() => scrollTo("publish")}>
              <CalendarClock /> Schedule
            </Button>
            <Button onClick={() => scrollTo("publish")}>
              <Send /> Publish
            </Button>
          </div>
          <Button className="w-full" variant="dark" loading={flow.busy} onClick={() => render(false)}>
            {ready && !stale ? "Re-render" : "Render visual"}
          </Button>
        </div>
      </aside>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent title="Preview" description={`${FORMATS[format].label} · ${FORMATS[format].width}×${FORMATS[format].height}`} className="max-w-xl">
          <div className={format === "story" ? "mx-auto max-w-xs" : undefined}>{preview}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
