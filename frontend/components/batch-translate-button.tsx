"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { translateChapter } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import type { Chapter } from "@/lib/types";

type BatchTranslateButtonProps = {
  chapters: Chapter[];
};

export function BatchTranslateButton({ chapters }: BatchTranslateButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      for (let index = 0; index < targets.length; index += 1) {
        await translateChapter(targets[index].id);
        setMessage(formatMessage(t("batchTranslateProgress"), { done: index + 1, total: targets.length }));
      }

      setMessage(t("batchTranslateDone"));
      setMessageType("success");
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
      {message ? <p className={`feedback${messageType ? ` ${messageType}` : ""}`}>{message}</p> : null}
    </div>
  );
}
