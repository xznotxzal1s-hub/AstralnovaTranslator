"use client";

import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import type { Chapter } from "@/lib/types";

type ReadModePanelProps = {
  chapter: Chapter;
};

export function ReadModePanel({ chapter }: ReadModePanelProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"translation-only" | "source-and-translation">(
    "source-and-translation",
  );

  const hasTranslation = Boolean(chapter.translated_text?.trim());

  return (
    <>
      <div className="reader-toolbar">
        <div>
          <p className="eyebrow">{t("readingModeLabel")}</p>
          <p className="reader-mode-note">{hasTranslation ? t("translationPanelTitle") : t("noTranslationSaved")}</p>
        </div>
        <div className="mode-toggle" role="tablist" aria-label={t("readingModeLabel")}>
          <button
            className={mode === "source-and-translation" ? "active" : ""}
            onClick={() => setMode("source-and-translation")}
            type="button"
          >
            {t("readModeBoth")}
          </button>
          <button
            className={mode === "translation-only" ? "active" : ""}
            onClick={() => setMode("translation-only")}
            type="button"
          >
            {t("readModeTranslationOnly")}
          </button>
        </div>
      </div>

      {mode === "source-and-translation" ? (
        <div className="text-columns split-reading-columns">
          <section className="text-panel source-panel">
            <p className="eyebrow">{t("sourcePanelTitle")}</p>
            <pre>{chapter.source_text}</pre>
          </section>
          <section className="text-panel translation-panel">
            <p className="eyebrow">{t("translationPanelTitle")}</p>
            <pre>{hasTranslation ? chapter.translated_text : t("noTranslationSaved")}</pre>
          </section>
        </div>
      ) : (
        <section className="text-panel translation-panel translation-only-panel">
          <p className="eyebrow">{t("translationPanelTitle")}</p>
          <pre>{hasTranslation ? chapter.translated_text : t("noTranslationSaved")}</pre>
        </section>
      )}
    </>
  );
}
