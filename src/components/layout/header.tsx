"use client";

import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/dialog";
import { NAV_SECTIONS } from "@/constants/nav";
import type { Session } from "@/types";
import { Logo } from "./logo";
import { SidebarNav, UserMenu } from "./sidebar";

function titleFor(pathname: string) {
  const all = NAV_SECTIONS.flatMap((s) => s.items);
  const match = [...all].sort((a, b) => b.href.length - a.href.length).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return match?.label ?? "Abyde Sermon";
}

export function Header({ session }: { session: Session }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" title="Navigation">
          <div className="flex h-14 items-center border-b border-border px-4">
            <Logo />
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
          <UserMenu session={session} />
        </SheetContent>
      </Sheet>

      <p className="text-sm font-medium">{titleFor(pathname)}</p>

      <div className="ml-auto flex items-center gap-2">
        <form
          role="search"
          className="hidden sm:block"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/library?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sermons…"
            aria-label="Search sermons"
            className="w-56 lg:w-72"
          />
        </form>
      </div>
    </header>
  );
}
