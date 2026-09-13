"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function ThemeSync() {
  const theme = useAppStore((s) => s.settings.theme);
  const accent = useAppStore((s) => s.settings.accentColor);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme ?? "dark");
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent ?? "purple");
  }, [accent]);

  return null;
}
