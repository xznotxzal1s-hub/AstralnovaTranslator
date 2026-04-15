"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import type { BookSummary } from "@/lib/types";

type BookCardProps = {
  book: BookSummary;
};

export function BookCard({ book }: BookCardProps) {
  const { locale, t } = useI18n();

  return (
    <article className="book-card">
      <div>
        <p className="eyebrow">{t("bookEyebrow")}</p>
        <h2>{book.title}</h2>
      </div>
      <div className="meta-row">
        <span>{new Date(book.updated_at).toLocaleString(locale)}</span>
      </div>
      <div className="action-row">
        <Link className="button" href={`/books/${book.id}`}>
          {t("openBookButton")}
        </Link>
      </div>
    </article>
  );
}
