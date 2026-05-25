"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FeedbackMessage } from "@/components/feedback-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { translateChapter } from "@/lib/api-client";

type TranslateChapterButtonProps = {
  chapterId: number;
  compact?: boolean;
};

export function TranslateChapterButton({
  chapterId,
  compact = false,
}: TranslateChapterButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleTranslate() {
    setMessage("");

    try {
      setIsSubmitting(true);
      await translateChapter(chapterId);
      router.refresh();
      setMessage(t("translationSavedMessage"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("translationFailedMessage"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={compact ? "translate-button-wrap compact" : "translate-button-wrap"}>
      <Button
        variant={compact ? "secondary" : "primary"}
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        onClick={handleTranslate}
        type="button"
      >
        {isSubmitting ? t("translatingLabel") : compact ? t("translateButton") : t("translateChapterButton")}
      </Button>
      {!compact ? (
        <FeedbackMessage message={message} type={message === t("translationFailedMessage") ? "error" : message ? "success" : ""} />
      ) : null}
    </div>
  );
}
