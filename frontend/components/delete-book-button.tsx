"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FeedbackMessage } from "@/components/feedback-message";
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
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirmDelete() {
    setMessage("");
    setMessageType("");
    try {
      setIsSubmitting(true);
      await deleteBook(bookId);
      setMessage(t("bookDeletedMessage"));
      setMessageType("success");
      setIsConfirmOpen(false);
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
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={compact ? "destructive-action compact" : "destructive-action"}>
      <button
        aria-busy={isSubmitting}
        className={compact ? "button-danger button-danger-ghost compact-button" : "button-danger"}
        disabled={isSubmitting}
        onClick={() => setIsConfirmOpen(true)}
        type="button"
      >
        {t("deleteBookButton")}
      </button>
      {!compact ? <FeedbackMessage message={message} type={messageType} /> : null}
      <ConfirmDialog
        open={isConfirmOpen}
        title={t("confirmDialogTitle")}
        message={formatMessage(t("confirmDeleteBook"), { title })}
        cancelLabel={t("confirmDialogCancel")}
        confirmLabel={t("confirmDialogConfirm")}
        isSubmitting={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
