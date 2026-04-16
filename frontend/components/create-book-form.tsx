"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { createBook } from "@/lib/api-client";

export function CreateBookForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim()) {
      setMessage(t("enterBookTitleError"));
      return;
    }

    try {
      setIsSubmitting(true);
      await createBook(title.trim());
      setTitle("");
      window.dispatchEvent(new Event("bookshelf:refresh"));
      router.refresh();
      setMessage(t("bookCreatedMessage"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("createBookError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card feature-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">{t("newBookEyebrow")}</p>
        <h2>{t("createBookTitle")}</h2>
      </div>
      <div className="field">
        <label htmlFor="book-title">{t("titleLabel")}</label>
        <input
          id="book-title"
          name="title"
          placeholder={t("bookTitlePlaceholder")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("creatingLabel") : t("createBookButton")}
      </button>
      <p className={`feedback${message && message === t("createBookError") ? " error" : message ? " success" : ""}`}>{message}</p>
    </form>
  );
}
