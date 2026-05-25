import { useI18n } from "@/components/i18n-provider";
import type { ReadMode } from "@/components/reader-preferences";
import type { Chapter } from "@/lib/types";

type ReadModePanelProps = {
  chapter: Chapter;
  mode: ReadMode;
  onModeChange: (mode: ReadMode) => void;
};

function ReaderText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.length > 0);

  return (
    <div className="reader-text">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>
      ))}
    </div>
  );
}

export function ReadModePanel({ chapter, mode, onModeChange }: ReadModePanelProps) {
  const { t } = useI18n();
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
            className={mode === "bilingual" ? "active" : ""}
            onClick={() => onModeChange("bilingual")}
            type="button"
          >
            {t("readModeBoth")}
          </button>
          <button
            className={mode === "translation-only" ? "active" : ""}
            onClick={() => onModeChange("translation-only")}
            type="button"
          >
            {t("readModeTranslationOnly")}
          </button>
          <button
            className={mode === "source-only" ? "active" : ""}
            onClick={() => onModeChange("source-only")}
            type="button"
          >
            {t("readModeSourceOnly")}
          </button>
        </div>
      </div>

      {mode === "bilingual" ? (
        <div className="text-columns split-reading-columns">
          <section className="text-panel source-panel">
            <div className="text-panel-header">
              <p className="eyebrow">{t("sourcePanelTitle")}</p>
            </div>
            <ReaderText text={chapter.source_text} />
          </section>
          <section className="text-panel translation-panel">
            <div className="text-panel-header">
              <p className="eyebrow">{t("translationPanelTitle")}</p>
            </div>
            <ReaderText text={hasTranslation ? chapter.translated_text ?? "" : t("noTranslationSaved")} />
          </section>
        </div>
      ) : mode === "source-only" ? (
        <section className="text-panel source-panel source-only-panel">
          <div className="text-panel-header">
            <p className="eyebrow">{t("sourcePanelTitle")}</p>
          </div>
          <ReaderText text={chapter.source_text} />
        </section>
      ) : (
        <section className="text-panel translation-panel translation-only-panel">
          <div className="text-panel-header">
            <p className="eyebrow">{t("translationPanelTitle")}</p>
          </div>
          <ReaderText text={hasTranslation ? chapter.translated_text ?? "" : t("noTranslationSaved")} />
        </section>
      )}
    </>
  );
}
