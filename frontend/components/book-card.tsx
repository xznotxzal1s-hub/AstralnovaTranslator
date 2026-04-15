import Link from "next/link";

import type { BookSummary } from "@/lib/types";

type BookCardProps = {
  book: BookSummary;
};

export function BookCard({ book }: BookCardProps) {
  return (
    <article className="book-card">
      <div>
        <p className="eyebrow">Book</p>
        <h2>{book.title}</h2>
      </div>
      <div className="meta-row">
        <span>{new Date(book.updated_at).toLocaleString()}</span>
      </div>
      <div className="action-row">
        <Link className="button" href={`/books/${book.id}`}>
          Open book
        </Link>
      </div>
    </article>
  );
}
