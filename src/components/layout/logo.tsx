import Link from "next/link";
import { cn } from "@/utils/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M8 21c4 0 4-10 8-10s4 10 8 10" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="11" r="1.6" fill="#fff" />
    </svg>
  );
}

export function Logo({ href = "/dashboard", showText = true, className }: { href?: string; showText?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)} aria-label="Abyde Sermon home">
      <LogoMark />
      {showText && <span className="text-[15px] font-semibold tracking-tight">Abyde Sermon</span>}
    </Link>
  );
}
