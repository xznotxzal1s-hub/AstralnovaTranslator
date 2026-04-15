"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { LOCALES, UI_LOCALE_COOKIE, type Locale } from "@/lib/i18n";

const labels: Record<Locale, string> = {
  "zh-CN": "简体中文",
  en: "English",
  ja: "日本語",
};

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale, t } = useI18n();

  function handleChange(nextLocale: string) {
    document.cookie = `${UI_LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <label className="language-switcher">
      <span>{t("languageLabel")}</span>
      <select value={locale} onChange={(event) => handleChange(event.target.value)}>
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
