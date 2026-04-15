"use client";

import { useState } from "react";

import type { Chapter } from "@/lib/types";

type ReadModePanelProps = {
  chapter: Chapter;
};

export function ReadModePanel({ chapter }: ReadModePanelProps) {
  const [mode, setMode] = useState<"translation-only" | "source-and-translation">(
    "source-and-translation",
  );

  const hasTranslation = Boolean(chapter.translated_text?.trim());

  return (
    <>
      <div className="reader-header">
        <div className="mode-toggle" role="tablist" aria-label="Reading mode">
          <button
            className={mode === "source-and-translation" ? "active" : ""}
            onClick={() => setMode("source-and-translation")}
            type="button"
          >
            Source + translation
          </button>
          <button
            className={mode === "translation-only" ? "active" : ""}
            onClick={() => setMode("translation-only")}
            type="button"
          >
            Translation only
          </button>
        </div>
      </div>

      {mode === "source-and-translation" ? (
        <div className="text-columns">
          <section className="text-panel">
            <p className="eyebrow">Source</p>
            <pre>{chapter.source_text}</pre>
          </section>
          <section className="text-panel">
            <p className="eyebrow">Translation</p>
            <pre>{hasTranslation ? chapter.translated_text : "No translated text saved yet."}</pre>
          </section>
        </div>
      ) : (
        <section className="text-panel">
          <p className="eyebrow">Translation</p>
          <pre>{hasTranslation ? chapter.translated_text : "No translated text saved yet."}</pre>
        </section>
      )}
    </>
  );
}
