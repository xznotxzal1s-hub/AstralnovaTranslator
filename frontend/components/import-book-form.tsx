"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { importBookFile } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";

type ImportBookFormProps = {
  title: string;
  description: string;
  endpoint: "txt" | "epub";
  accept: string;
};

export function ImportBookForm({ title, description, endpoint, accept }: ImportBookFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [bookTitle, setBookTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;

    if (!file) {
      setMessage(t("importChooseFileError"));
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await importBookFile({
        bookTitle: bookTitle.trim(),
        endpoint,
        file,
      });
      setBookTitle("");
      setFile(null);
      const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }
      window.dispatchEvent(new Event("bookshelf:refresh"));
      router.refresh();
      setMessage(formatMessage(t("importSuccess"), { title: result.book_title, count: result.chapter_count }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("importFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card feature-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">{t("importEyebrow")}</p>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      <div className="field">
        <label htmlFor={`${endpoint}-book-title`}>{t("importBookTitleOverride")}</label>
        <input
          id={`${endpoint}-book-title`}
          placeholder={t("importBookTitlePlaceholder")}
          value={bookTitle}
          onChange={(event) => setBookTitle(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${endpoint}-file`}>{t("importChooseFile")}</label>
        <input
          accept={accept}
          id={`${endpoint}-file`}
          name="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </div>
      <button className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? t("importingLabel") : title}
      </button>
      <p className={`feedback${message && message === t("importFailed") ? " error" : message ? " success" : ""}`}>{message}</p>
    </form>
  );
}
