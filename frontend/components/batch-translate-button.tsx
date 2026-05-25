"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { createBookTranslationJob, fetchTranslationJob } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import type { Chapter, TranslationJob } from "@/lib/types";

type BatchTranslateButtonProps = {
  bookId: number;
  chapters: Chapter[];
};

const POLL_INTERVAL_MS = 1200;
const TERMINAL_JOB_STATUSES = new Set<TranslationJob["status"]>(["succeeded", "failed", "cancelled"]);

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function BatchTranslateButton({ bookId, chapters }: BatchTranslateButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setProgressMessage(job: TranslationJob) {
    setMessage(formatMessage(t("batchTranslateProgress"), { done: job.completed_items, total: job.total_items }));
  }

  async function handleBatchTranslate() {
    const targets = chapters.filter(
      (chapter) => chapter.translation_status !== "translated" || !chapter.translated_text?.trim(),
    );

    if (targets.length === 0) {
      setMessage(t("batchTranslateNothingToDo"));
      setMessageType("success");
      return;
    }

    setIsSubmitting(true);
    setMessageType("success");
    setMessage(formatMessage(t("batchTranslateProgress"), { done: 0, total: targets.length }));

    try {
      let job = await createBookTranslationJob(bookId);
      if (job.total_items === 0 || job.status === "succeeded") {
        setMessage(t("batchTranslateNothingToDo"));
        setMessageType("success");
        router.refresh();
        return;
      }

      setProgressMessage(job);
      while (!TERMINAL_JOB_STATUSES.has(job.status)) {
        await wait(POLL_INTERVAL_MS);
        job = await fetchTranslationJob(job.id);
        setProgressMessage(job);
      }

      if (job.status === "succeeded") {
        setMessage(t("batchTranslateDone"));
        setMessageType("success");
        router.refresh();
        return;
      }

      const failureMessage =
        job.status === "cancelled"
          ? t("batchTranslateCancelled")
          : job.error_message || t("translationFailedMessage");
      setMessage(formatMessage(t("batchTranslateError"), { message: failureMessage }));
      setMessageType("error");
      router.refresh();
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : t("translationFailedMessage");
      setMessage(formatMessage(t("batchTranslateError"), { message: fallbackMessage }));
      setMessageType("error");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="batch-translate-panel">
      <button className="button" disabled={isSubmitting} aria-busy={isSubmitting} onClick={handleBatchTranslate} type="button">
        {isSubmitting ? t("batchTranslateRunning") : t("batchTranslateButton")}
      </button>
      {isSubmitting ? <p className="batch-translate-note">{t("batchTranslateCancelNote")}</p> : null}
      {message ? <p className={`feedback${messageType ? ` ${messageType}` : ""}`}>{message}</p> : null}
    </div>
  );
}
