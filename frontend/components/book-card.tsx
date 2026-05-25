"use client";

import Image from "next/image";
import Link from "next/link";

import { DeleteBookButton } from "@/components/delete-book-button";
import { useI18n } from "@/components/i18n-provider";
import { ButtonLink } from "@/components/ui/button";
import type { BookSummary } from "@/lib/types";

type BookCardProps = {
  book: BookSummary;
  onDeleted?: (bookId: number) => void | Promise<void>;
};

export function BookCard({ book, onDeleted }: BookCardProps) {
  const { locale, t } = useI18n();
  const updatedDate = new Date(book.updated_at);

  return (
    <article className="book-card shelf-book-card">
      <Link className="book-cover-link" href={`/books/${book.id}`} aria-label={`${t("openBookButton")}：${book.title}`}>
        <div className="book-cover">
          <Image
            src="/default-book-cover.png"
            alt={book.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1100px) 28vw, 210px"
            className="book-cover-image"
          />
        </div>
      </Link>

      <div className="book-card-content">
        <Link className="book-title-link" href={`/books/${book.id}`}>
          <h2>{book.title}</h2>
        </Link>
        <p className="book-meta">
          <span className="book-meta-dot" aria-hidden="true" />
          {updatedDate.toLocaleDateString(locale)}
        </p>
      </div>

      <div className="book-card-actions">
        <ButtonLink className="compact-button" href={`/books/${book.id}`}>
          {t("openBookButton")}
        </ButtonLink>
        <DeleteBookButton bookId={book.id} title={book.title} compact onDeleted={onDeleted} />
      </div>
    </article>
  );
}
