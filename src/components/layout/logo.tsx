import { useId } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";

const LEAF = "M0 0C10-13 30-13 42 0C30 13 10 13 0 0Z";

/** The vine-and-cross mark, drawn bold so it holds up at small sizes. Same artwork as app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  const gradient = `logo-gradient-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 200 200" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="30" y1="20" x2="170" y2="180">
          <stop offset="0" stopColor="#D91A45" />
          <stop offset="0.5" stopColor="#A21C86" />
          <stop offset="1" stopColor="#5B23C2" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="86" fill="none" stroke={`url(#${gradient})`} strokeWidth="12" />
      <path d="M100 160V48M66 80h68" stroke={`url(#${gradient})`} strokeWidth="16" strokeLinecap="round" />
      <path d={LEAF} fill="#7A21B0" transform="translate(100 146) rotate(-35) scale(1.1)" />
      <path d={LEAF} fill="#A21C86" transform="translate(100 146) rotate(-145) scale(1.1)" />
      <path d={LEAF} fill="#A21C86" transform="translate(100 114) rotate(-30) scale(0.8)" />
      <path d={LEAF} fill="#C81A55" transform="translate(100 114) rotate(-150) scale(0.8)" />
    </svg>
  );
}

export function Logo({ href = "/dashboard", showText = true, className }: { href?: string; showText?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)} aria-label="Abyde Sermon home">
      <LogoMark />
      {showText && (
        <span className="flex items-baseline gap-1.5 leading-none">
          <span className="font-logo text-[22px] font-semibold italic text-[#3A1450]">Abyde</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8E1A78]">Sermon</span>
        </span>
      )}
    </Link>
  );
}
