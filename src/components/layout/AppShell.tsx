"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";

import { AppSidebar, type SidebarUser } from "@/components/custom/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Application shell for every authenticated route.
 */
export function AppShell({
  user,
  children,
}: {
  user: SidebarUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-col md:grid md:grid-cols-[236px_1fr]">
      <aside className="hidden border-r bg-card md:sticky md:top-0 md:block md:h-svh">
        <AppSidebar user={user} />
      </aside>

      <header className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <AppSidebar user={user} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <span className="text-sm font-semibold">CRM Dashboard</span>
      </header>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
