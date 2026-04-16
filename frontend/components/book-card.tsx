"use client";

import Link from "next/link";

import { DeleteBookButton } from "@/components/delete-book-button";
import { useI18n } from "@/components/i18n-provider";
import type { BookSummary } from "@/lib/types";

type BookCardProps = {
  book: BookSummary;
  onDeleted?: (bookId: number) => void | Promise<void>;
};

export function BookCard({ book, onDeleted }: BookCardProps) {
  const { locale, t } = useI18n();

  return (
    <article className="book-card">
      <div className="book-card-top">
        <div className="card-heading">
          <p className="eyebrow">{t("bookEyebrow")}</p>
          <h2>{book.title}</h2>
        </div>
        <span className="pill book-card-date">{new Date(book.updated_at).toLocaleDateString(locale)}</span>
      </div>
      <div className="book-card-body">
        <p className="book-meta">{new Date(book.updated_at).toLocaleString(locale)}</p>
      </div>
      <div className="action-row">
        <Link className="button" href={`/books/${book.id}`}>
          {t("openBookButton")}
        </Link>
        <DeleteBookButton bookId={book.id} title={book.title} compact onDeleted={onDeleted} />
      </div>
    </article>
  );
}
