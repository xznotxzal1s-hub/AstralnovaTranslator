"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createBook } from "@/lib/api-client";

export function CreateBookForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter a book title.");
      return;
    }

    try {
      await createBook(title.trim());
      setTitle("");
      startTransition(() => {
        router.refresh();
      });
      setMessage("Book created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create the book.");
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">New Book</p>
        <h2>Create a book</h2>
      </div>
      <div className="field">
        <label htmlFor="book-title">Title</label>
        <input
          id="book-title"
          name="title"
          placeholder="Example: My Favorite Light Novel"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create book"}
      </button>
      <p className={`feedback${message && message.includes("Failed") ? " error" : ""}`}>{message}</p>
    </form>
  );
}
