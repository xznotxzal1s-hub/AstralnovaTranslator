"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FeedbackMessage } from "@/components/feedback-message";
import { useI18n } from "@/components/i18n-provider";
import { deleteChapter } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";

type DeleteChapterButtonProps = {
  chapterId: number;
  title: string;
};

export function DeleteChapterButton({ chapterId, title }: DeleteChapterButtonProps) {
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
      await deleteChapter(chapterId);
      setMessage(t("chapterDeletedMessage"));
      setMessageType("success");
      setIsConfirmOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("deleteChapterError"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="destructive-action compact">
      <button
        className="button-danger button-danger-ghost"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        onClick={() => setIsConfirmOpen(true)}
        type="button"
      >
        {t("deleteChapterButton")}
      </button>
      <FeedbackMessage message={message} type={messageType} />
      <ConfirmDialog
        open={isConfirmOpen}
        title={t("confirmDialogTitle")}
        message={formatMessage(t("confirmDeleteChapter"), { title })}
        cancelLabel={t("confirmDialogCancel")}
        confirmLabel={t("confirmDialogConfirm")}
        isSubmitting={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
