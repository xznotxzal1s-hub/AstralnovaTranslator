"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "astralnova_theme";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readSavedTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const savedTheme = readSavedTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      aria-label={t("themeToggleLabel")}
      aria-pressed={theme === "dark"}
      className="theme-toggle"
      type="button"
      onClick={handleToggle}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span />
      </span>
      <span>{theme === "dark" ? t("themeDarkLabel") : t("themeLightLabel")}</span>
    </button>
  );
}
