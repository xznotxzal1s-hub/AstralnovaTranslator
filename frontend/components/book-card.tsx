"use client";

import Link from "next/link";

import { DeleteBookButton } from "@/components/delete-book-button";
import { useI18n } from "@/components/i18n-provider";
import type { BookSummary } from "@/lib/types";

type BookCardProps = {
  book: BookSummary;
};

export function BookCard({ book }: BookCardProps) {
  const { locale, t } = useI18n();

  return (
    <article className="book-card">
      <div className="card-heading">
        <p className="eyebrow">{t("bookEyebrow")}</p>
        <h2>{book.title}</h2>
      </div>
      <div className="meta-row book-meta">
        <span>{new Date(book.updated_at).toLocaleString(locale)}</span>
      </div>
      <div className="action-row">
        <Link className="button" href={`/books/${book.id}`}>
          {t("openBookButton")}
        </Link>
        <DeleteBookButton bookId={book.id} title={book.title} compact />
      </div>
    </article>
  );
}
