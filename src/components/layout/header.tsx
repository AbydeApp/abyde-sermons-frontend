"use client";

import { Menu, ChevronDown, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-session";
import type { Session } from "@/types";
import { Logo } from "./logo";
import { SidebarNav, UserMenu } from "./sidebar";

export function Header({ session }: { session: Session }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const logout = useLogout();

  const handleSettings = () => {
    router.push("/settings");
  };

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

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 py-1.5 h-auto hidden sm:flex items-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <div className="flex flex-col items-end text-sm">
                <span className="font-medium text-foreground">{session.user.fullName}</span>
                {session.church && (
                  <span className="text-muted-foreground">{session.church.name}</span>
                )}
              </div>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSettings}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLogoutOpen(true)} className="text-danger focus:text-danger">
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Log out?"
        description="Are you sure you want to log out of Abyde Sermon?"
        confirmLabel="Log out"
        loading={logout.isPending}
        onConfirm={() =>
          logout.mutate(undefined, {
            onError: () => toast.error("Couldn't log out. Please try again."),
          })
        }
      />
    </header>
  );
}
