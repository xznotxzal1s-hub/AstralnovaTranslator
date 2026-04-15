"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createChapter } from "@/lib/api-client";

type CreateChapterFormProps = {
  bookId: number;
};

export function CreateChapterForm({ bookId }: CreateChapterFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim() || !sourceText.trim()) {
      setMessage("Please enter a chapter title and Japanese text.");
      return;
    }

    try {
      await createChapter(bookId, {
        title: title.trim(),
        source_text: sourceText.trim(),
      });
      setTitle("");
      setSourceText("");
      startTransition(() => {
        router.refresh();
      });
      setMessage("Chapter created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create the chapter.");
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Manual Paste</p>
        <h2>Add a chapter</h2>
      </div>
      <div className="field">
        <label htmlFor="chapter-title">Chapter title</label>
        <input
          id="chapter-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Example: Chapter 1"
        />
      </div>
      <div className="field">
        <label htmlFor="source-text">Japanese text</label>
        <textarea
          id="source-text"
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder="Paste the Japanese chapter text here."
        />
      </div>
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Create chapter"}
      </button>
      <p className={`feedback${message && message.includes("Failed") ? " error" : ""}`}>{message}</p>
    </form>
  );
}
