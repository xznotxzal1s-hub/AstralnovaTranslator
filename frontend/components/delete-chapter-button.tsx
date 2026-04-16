"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(formatMessage(t("confirmDeleteChapter"), { title }));
    if (!confirmed) {
      return;
    }

    setMessage("");
    try {
      setIsSubmitting(true);
      await deleteChapter(chapterId);
      setMessage(t("chapterDeletedMessage"));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("deleteChapterError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="destructive-action compact">
      <button className="button-danger button-danger-ghost" disabled={isSubmitting} onClick={handleDelete} type="button">
        {t("deleteChapterButton")}
      </button>
      {message ? <p className={`feedback${message === t("deleteChapterError") ? " error" : " success"}`}>{message}</p> : null}
    </div>
  );
}
