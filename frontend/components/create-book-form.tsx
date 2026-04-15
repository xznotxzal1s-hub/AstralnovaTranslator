"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBook } from "@/lib/api-client";

export function CreateBookForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter a book title.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createBook(title.trim());
      setTitle("");
      router.refresh();
      setMessage("Book created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create the book.");
    } finally {
      setIsSubmitting(false);
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
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create book"}
      </button>
      <p className={`feedback${message && message.includes("Failed") ? " error" : ""}`}>{message}</p>
    </form>
  );
}
