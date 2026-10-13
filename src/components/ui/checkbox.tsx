"use client";

import { Checkbox as C, RadioGroup as R } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-card transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-white disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </C.Indicator>
    </C.Root>
  );
}

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof R.Root>) {
  return <R.Root className={cn("grid gap-2", className)} {...props} />;
}

export function RadioItem({ className, ...props }: React.ComponentProps<typeof R.Item>) {
  return (
    <R.Item
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-card data-[state=checked]:border-accent",
        className,
      )}
      {...props}
    >
      <R.Indicator className="size-2 rounded-full bg-accent" />
    </R.Item>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  ...props
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-accent" : "bg-border-strong",
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
