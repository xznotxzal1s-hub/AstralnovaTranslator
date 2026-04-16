"use client";

import { useEffect, useState } from "react";

import { BookCard } from "@/components/book-card";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/components/i18n-provider";
import { fetchBooksClient } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import type { BookSummary } from "@/lib/types";

type BookshelfSectionProps = {
  initialBooks: BookSummary[];
};

export function BookshelfSection({ initialBooks }: BookshelfSectionProps) {
  const { t } = useI18n();
  const [books, setBooks] = useState(initialBooks);

  useEffect(() => {
    let isMounted = true;

    async function loadBooks() {
      try {
        const latestBooks = await fetchBooksClient();
        if (isMounted) {
          setBooks(latestBooks);
        }
      } catch {
        // Keep the server-rendered list if the client refresh fails.
      }
    }

    function handleRefresh() {
      void loadBooks();
    }

    void loadBooks();
    window.addEventListener("bookshelf:refresh", handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener("bookshelf:refresh", handleRefresh);
    };
  }, []);

  const bookLabel = books.length === 1 ? t("bookSingular") : t("bookPlural");

  return (
    <section className="panel section-panel">
      <div className="section-header">
        <div>
          <h2>{t("booksHeading")}</h2>
          <p>{formatMessage(t("booksCount"), { count: books.length, label: bookLabel })}</p>
        </div>
      </div>

      {books.length === 0 ? (
        <EmptyState title={t("noBooksTitle")} description={t("noBooksDescription")} />
      ) : (
        <section className="book-grid">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </section>
      )}
    </section>
  );
}
