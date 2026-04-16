"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { deleteBook } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";

type DeleteBookButtonProps = {
  bookId: number;
  title: string;
  compact?: boolean;
  redirectToBookshelf?: boolean;
  onDeleted?: (bookId: number) => void | Promise<void>;
};

export function DeleteBookButton({
  bookId,
  title,
  compact = false,
  redirectToBookshelf = false,
  onDeleted,
}: DeleteBookButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(formatMessage(t("confirmDeleteBook"), { title }));
    if (!confirmed) {
      return;
    }

    setMessage("");
    try {
      setIsSubmitting(true);
      await deleteBook(bookId);
      setMessage(t("bookDeletedMessage"));
      if (onDeleted) {
        await onDeleted(bookId);
      }
      if (redirectToBookshelf) {
        router.push("/");
        router.refresh();
        return;
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("deleteBookError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={compact ? "destructive-action compact" : "destructive-action"}>
      <button className="button-danger" disabled={isSubmitting} onClick={handleDelete} type="button">
        {t("deleteBookButton")}
      </button>
      {!compact && message ? (
        <p className={`feedback${message === t("deleteBookError") ? " error" : " success"}`}>{message}</p>
      ) : null}
    </div>
  );
}
