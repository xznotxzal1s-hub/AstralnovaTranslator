"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { createChapter } from "@/lib/api-client";

type CreateChapterFormProps = {
  bookId: number;
};

export function CreateChapterForm({ bookId }: CreateChapterFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim() || !sourceText.trim()) {
      setMessage(t("enterChapterError"));
      return;
    }

    try {
      setIsSubmitting(true);
      await createChapter(bookId, {
        title: title.trim(),
        source_text: sourceText.trim(),
      });
      setTitle("");
      setSourceText("");
      router.refresh();
      setMessage(t("chapterCreatedMessage"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("createChapterError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card feature-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">{t("manualPasteEyebrow")}</p>
        <h2>{t("addChapterTitle")}</h2>
      </div>
      <div className="field">
        <label htmlFor="chapter-title">{t("chapterTitleLabel")}</label>
        <input
          id="chapter-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("chapterTitlePlaceholder")}
        />
      </div>
      <div className="field">
        <label htmlFor="source-text">{t("sourceTextLabel")}</label>
        <textarea
          id="source-text"
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder={t("sourceTextPlaceholder")}
        />
      </div>
      <button className="button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? t("savingLabel") : t("createChapterButton")}
      </button>
      <p className={`feedback${message && message === t("createChapterError") ? " error" : message ? " success" : ""}`}>{message}</p>
    </form>
  );
}
