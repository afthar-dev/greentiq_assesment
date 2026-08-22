"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
] as const;

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border p-0.5"
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = mounted && theme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className={cn(
              "flex flex-1 items-center justify-center rounded-sm py-1 text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              isActive && "bg-primary text-primary-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
