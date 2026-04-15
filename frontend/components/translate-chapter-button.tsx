"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();

  async function handleTranslate() {
    setMessage("");

    try {
      await translateChapter(chapterId);
      startTransition(() => {
        router.refresh();
      });
      setMessage("Translation saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Translation failed.");
    }
  }

  return (
    <div>
      <button
        className={compact ? "button-secondary" : "button"}
        disabled={isPending}
        onClick={handleTranslate}
        type="button"
      >
        {isPending ? "Translating..." : compact ? "Translate" : "Translate chapter"}
      </button>
      {!compact && message ? (
        <p className={`feedback${message.includes("failed") || message.includes("Failed") ? " error" : ""}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
