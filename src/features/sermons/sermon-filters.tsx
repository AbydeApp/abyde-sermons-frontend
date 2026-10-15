"use client";

import { Select } from "@/components/ui/select";
import { useFacets } from "@/features/library/queries";
import type { LibraryParams } from "@/services/library.service";

export type FilterKey = "speaker" | "series" | "scripture" | "theme" | "year" | "tag";
export type Filters = Partial<Record<FilterKey, string>>;

const FILTERS: { key: FilterKey; label: string; facet: "speakers" | "series" | "scriptures" | "themes" | "years" | "tags" }[] = [
  { key: "speaker", label: "Speaker", facet: "speakers" },
  { key: "series", label: "Series", facet: "series" },
  { key: "scripture", label: "Scripture", facet: "scriptures" },
  { key: "theme", label: "Theme", facet: "themes" },
  { key: "year", label: "Year", facet: "years" },
  { key: "tag", label: "Tags", facet: "tags" },
];

export const hasFilters = (f: Filters) => Object.values(f).some(Boolean);
export const filterParams = (f: Filters): Pick<LibraryParams, FilterKey> => f;

export function SermonFilters({ value, onChange }: { value: Filters; onChange: (next: Filters) => void }) {
  const facets = useFacets();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {FILTERS.map((f) => (
        <Select
          key={f.key}
          aria-label={f.label}
          allowClear
          placeholder={f.label}
          value={value[f.key] ?? ""}
          onValueChange={(v) => onChange({ ...value, [f.key]: v })}
          options={(facets.data?.[f.facet] ?? []).map((v) => ({ value: v, label: v }))}
        />
      ))}
    </div>
  );
}
