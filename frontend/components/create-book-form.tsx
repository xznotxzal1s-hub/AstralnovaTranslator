"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FeedbackMessage } from "@/components/feedback-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { createBook } from "@/lib/api-client";
import type { BookSummary } from "@/lib/types";

type CreateBookFormProps = {
  onSuccess?: (book: BookSummary) => void | Promise<void>;
};

export function CreateBookForm({ onSuccess }: CreateBookFormProps) {
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
      const createdBook = await createBook(title.trim());
      setTitle("");
      if (onSuccess) {
        await onSuccess(createdBook);
      } else {
        router.refresh();
      }
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
      <FormField htmlFor="book-title" label={t("titleLabel")}>
        <input
          id="book-title"
          name="title"
          placeholder={t("bookTitlePlaceholder")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? t("creatingLabel") : t("createBookButton")}
      </Button>
      <FeedbackMessage
        message={message}
        type={message && message === t("createBookError") ? "error" : message ? "success" : ""}
      />
    </form>
  );
}
