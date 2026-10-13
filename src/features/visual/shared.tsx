"use client";

import { Check } from "lucide-react";
import { BrandPreview, type PreviewBrand } from "@/components/brand/brand-preview";
import type { BrandAsset, ContentTemplate, VisualFormat } from "@/types";
import { cn } from "@/utils/cn";

export function extFor(url: string) {
  if (url.startsWith("data:image/svg")) return "svg";
  const m = url.split("?")[0].match(/\.(png|jpe?g|webp|mp4|svg)$/i);
  return m ? m[1].toLowerCase() : "png";
}

/** Pick one of the church's templates for this category. */
export function TemplatePicker({ templates, value, onChange, brand, format, headline, body, label, background }: {
  templates: ContentTemplate[];
  value?: string;
  onChange: (id: string) => void;
  brand: PreviewBrand;
  format: VisualFormat;
  headline: string;
  body?: string;
  label?: string;
  background?: string | null;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Template">
      {templates.map((t) => {
        const on = t.id === value;
        return (
          <li key={t.id}>
            <button type="button" role="radio" aria-checked={on} onClick={() => onChange(t.id)} className={cn("relative block w-full rounded-md border p-1 text-left", on ? "border-accent ring-2 ring-accent/25" : "border-border hover:border-border-strong")}>
              <div className={format === "story" ? "mx-auto max-w-[3.5rem]" : undefined}>
                <BrandPreview brand={brand} variant={t.variant} format={format} headline={headline} body={body} label={label} backgroundUrl={background} className="pointer-events-none" />
              </div>
              <span className="mt-1 flex items-center justify-between text-[11px]">
                {t.name}
                {on && <Check className="size-3 text-accent" aria-hidden />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Choose a background image from the brand library (or none). */
export function BackgroundPicker({ assets, value, onChange }: { assets: BrandAsset[]; value: string | null; onChange: (id: string | null) => void }) {
  const usable = assets.filter((a) => a.kind !== "LOGO" && a.kind !== "WATERMARK");
  return (
    <div role="radiogroup" aria-label="Background" className="flex flex-wrap gap-2">
      <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={cn("flex size-14 items-center justify-center rounded-md border text-[11px]", value === null ? "border-accent ring-2 ring-accent/25" : "border-border hover:border-border-strong")}>
        None
      </button>
      {usable.map((a) => (
        <button key={a.id} type="button" role="radio" aria-checked={value === a.id} aria-label={a.name} onClick={() => onChange(a.id)} className={cn("size-14 overflow-hidden rounded-md border", value === a.id ? "border-accent ring-2 ring-accent/25" : "border-border hover:border-border-strong")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- brand asset */}
          <img src={a.url} alt="" className="size-full object-cover" />
        </button>
      ))}
      {usable.length === 0 && <p className="self-center text-xs text-muted-foreground">Upload portraits or backgrounds in Brand Studio → Assets.</p>}
    </div>
  );
}
