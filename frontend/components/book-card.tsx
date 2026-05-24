"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
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
  const coverTone = (book.id % 5) + 1;
  const coverInitial = book.title.trim().slice(0, 1).toUpperCase() || "A";
  const updatedDate = new Date(book.updated_at);

  return (
    <article className="book-card shelf-book-card">
      <Link className="book-cover-link" href={`/books/${book.id}`}>
        <div className={`book-cover book-cover-tone-${coverTone}`}>
          <span className="book-cover-label">{t("bookEyebrow")}</span>
          <span className="book-cover-initial">{coverInitial}</span>
          <span className="book-cover-rule" />
        </div>
      </Link>

      <div className="book-card-content">
        <Link className="book-title-link" href={`/books/${book.id}`}>
          <h2>{book.title}</h2>
        </Link>
        <p className="book-meta">
          <CalendarDays aria-hidden="true" size={15} />
          {updatedDate.toLocaleDateString(locale)}
        </p>
      </div>

      <div className="book-card-actions">
        <Link className="button-link compact-button" href={`/books/${book.id}`}>
          <ExternalLink aria-hidden="true" size={15} />
          {t("openBookButton")}
        </Link>
        <DeleteBookButton bookId={book.id} title={book.title} compact onDeleted={onDeleted} />
      </div>
    </article>
  );
}
