"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { importBookFromUrl } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import type { ImportResult } from "@/lib/types";

type ImportUrlFormProps = {
  onSuccess?: (result: ImportResult) => void | Promise<void>;
};

export function ImportUrlForm({ onSuccess }: ImportUrlFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (!url.trim()) {
      setMessage(t("importUrlRequired"));
      setMessageType("error");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await importBookFromUrl({
        url: url.trim(),
        bookTitle: bookTitle.trim(),
      });
      setUrl("");
      setBookTitle("");
      if (onSuccess) {
        await onSuccess(result);
      } else {
        router.refresh();
      }
      setMessage(formatMessage(t("importSuccess"), { title: result.book_title, count: result.chapter_count }));
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("importUrlFailed"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card feature-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">{t("importEyebrow")}</p>
        <h2>{t("importUrlTitle")}</h2>
        <p className="muted">{t("importUrlDescription")}</p>
      </div>
      <div className="field">
        <label htmlFor="url-import-input">{t("importUrlLabel")}</label>
        <input
          id="url-import-input"
          inputMode="url"
          placeholder={t("importUrlPlaceholder")}
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="url-book-title">{t("importBookTitleOverride")}</label>
        <input
          id="url-book-title"
          placeholder={t("importBookTitlePlaceholder")}
          value={bookTitle}
          onChange={(event) => setBookTitle(event.target.value)}
        />
      </div>
      <button aria-busy={isSubmitting} className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? t("importingLabel") : t("importUrlButton")}
      </button>
      <p className={`feedback${messageType ? ` ${messageType}` : ""}`}>{message}</p>
    </form>
  );
}
