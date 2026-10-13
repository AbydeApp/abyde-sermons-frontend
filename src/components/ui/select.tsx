"use client";

import { Select as S } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

/** Radix Select can't hold an empty-string value; this sentinel stands in for "none". */
const NONE = "__none__";

export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
  allowClear,
  ...aria
}: {
  id?: string;
  value?: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}) {
  return (
    <S.Root
      value={value === "" || value === undefined ? undefined : value}
      onValueChange={(v) => onValueChange(v === NONE ? "" : v)}
      disabled={disabled}
    >
      <S.Trigger
        id={id}
        {...aria}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-card px-3 text-sm transition-colors focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/25 disabled:opacity-60 aria-[invalid=true]:border-danger data-[placeholder]:text-muted-foreground/80",
          className,
        )}
      >
        <span className="truncate"><S.Value placeholder={placeholder} /></span>
        <S.Icon><ChevronDown className="size-4 text-muted-foreground" aria-hidden /></S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={4}
          className="z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-card shadow-md"
        >
          <S.Viewport className="p-1">
            {allowClear && (
              <S.Item value={NONE} className={itemCls}>
                <S.ItemText>Any</S.ItemText>
              </S.Item>
            )}
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} className={itemCls}>
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator className="absolute right-2">
                  <Check className="size-3.5" aria-hidden />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}

const itemCls =
  "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-7 text-sm outline-none data-[highlighted]:bg-muted data-[state=checked]:font-medium";
