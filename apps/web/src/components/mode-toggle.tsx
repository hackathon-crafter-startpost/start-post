"use client";

import React, { useState, useEffect } from "react";
import { Moon, Sun, Laptop, Check } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="size-7 sm:size-8 rounded-full border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 flex items-center justify-center opacity-50"
        aria-hidden="true"
      >
        <span className="size-3.5" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="size-7 sm:size-8 rounded-full border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 text-[#1d1d1f] dark:text-[#d2d2d7] hover:text-black dark:hover:text-white transition-all flex items-center justify-center cursor-pointer relative outline-none focus-visible:ring-1 focus-visible:ring-[#2997ff]"
        aria-label="Cambiar tema de la aplicación"
        title="Cambiar tema (Claro / Oscuro / Sistema)"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="size-3.5 text-[#2997ff] transition-transform duration-200" />
        ) : (
          <Sun className="size-3.5 text-amber-500 transition-transform duration-200" />
        )}
        <span className="sr-only">Cambiar tema</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[150px] w-auto p-1.5 rounded-2xl bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl border border-black/10 dark:border-white/15 shadow-2xl text-[#1d1d1f] dark:text-white z-50 animate-in fade-in-0 zoom-in-95"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-[#6e6e73] dark:text-[#d2d2d7] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer outline-none"
        >
          <div className="flex items-center gap-2">
            <Sun className="size-3.5 text-amber-500" />
            <span>Claro</span>
          </div>
          {theme === "light" && <Check className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-[#6e6e73] dark:text-[#d2d2d7] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer outline-none"
        >
          <div className="flex items-center gap-2">
            <Moon className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />
            <span>Oscuro</span>
          </div>
          {theme === "dark" && <Check className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-[#6e6e73] dark:text-[#d2d2d7] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer outline-none"
        >
          <div className="flex items-center gap-2">
            <Laptop className="size-3.5 text-[#86868b]" />
            <span>Sistema</span>
          </div>
          {theme === "system" && <Check className="size-3.5 text-[#0066cc] dark:text-[#2997ff]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
