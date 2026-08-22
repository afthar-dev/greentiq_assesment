"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon, UsersIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/custom/sign-out-button";

export type SidebarUser = {
  name: string;
  email: string;
  image?: string | null;
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon },
] as const;

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar({
  user,
  onNavigate,
}: {
  user: SidebarUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-6 p-3">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2 px-2 pt-1"
      >
        <span className="grid size-7 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          C
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          CRM Dashboard
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // "/" would match every route with startsWith, so it needs an
          // exact check while nested routes stay highlighted on their children.
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                isActive && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t pt-3">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="size-8">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="text-xs">
              {initials(user.name || user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>

        <SignOutButton className="w-full justify-center" />
      </div>
    </div>
  );
}
