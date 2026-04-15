"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleTranslate() {
    setMessage("");

    try {
      setIsSubmitting(true);
      await translateChapter(chapterId);
      router.refresh();
      setMessage("Translation saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Translation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <button
        className={compact ? "button-secondary" : "button"}
        disabled={isSubmitting}
        onClick={handleTranslate}
        type="button"
      >
        {isSubmitting ? "Translating..." : compact ? "Translate" : "Translate chapter"}
      </button>
      {!compact && message ? (
        <p className={`feedback${message.includes("failed") || message.includes("Failed") ? " error" : ""}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
