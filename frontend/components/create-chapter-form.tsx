"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FeedbackMessage } from "@/components/feedback-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
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
      <FormField htmlFor="chapter-title" label={t("chapterTitleLabel")}>
        <input
          id="chapter-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("chapterTitlePlaceholder")}
        />
      </FormField>
      <FormField htmlFor="source-text" label={t("sourceTextLabel")}>
        <textarea
          id="source-text"
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder={t("sourceTextPlaceholder")}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? t("savingLabel") : t("createChapterButton")}
      </Button>
      <FeedbackMessage
        message={message}
        type={message && message === t("createChapterError") ? "error" : message ? "success" : ""}
      />
    </form>
  );
}
