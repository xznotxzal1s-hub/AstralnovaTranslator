"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { importBookFile } from "@/lib/api-client";

type ImportBookFormProps = {
  title: string;
  description: string;
  endpoint: "txt" | "epub";
  accept: string;
};

export function ImportBookForm({ title, description, endpoint, accept }: ImportBookFormProps) {
  const router = useRouter();
  const [bookTitle, setBookTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;

    if (!file) {
      setMessage("Please choose a file first.");
      return;
    }

    try {
      const result = await importBookFile({
        bookTitle: bookTitle.trim(),
        endpoint,
        file,
      });
      setBookTitle("");
      setFile(null);
      const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }
      startTransition(() => {
        router.refresh();
      });
      setMessage(`Imported "${result.book_title}" with ${result.chapter_count} chapter(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Import</p>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      <div className="field">
        <label htmlFor={`${endpoint}-book-title`}>Book title override (optional)</label>
        <input
          id={`${endpoint}-book-title`}
          placeholder="Leave blank to use the file title"
          value={bookTitle}
          onChange={(event) => setBookTitle(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${endpoint}-file`}>Choose file</label>
        <input
          accept={accept}
          id={`${endpoint}-file`}
          name="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </div>
      <button className="button" disabled={isPending} type="submit">
        {isPending ? "Importing..." : title}
      </button>
      <p className={`feedback${message && message.toLowerCase().includes("failed") ? " error" : ""}`}>{message}</p>
    </form>
  );
}
