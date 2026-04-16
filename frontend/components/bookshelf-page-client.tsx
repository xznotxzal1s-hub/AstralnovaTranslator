"use client";

import { useEffect, useState } from "react";

import { BookshelfSection } from "@/components/bookshelf-section";
import { CreateBookForm } from "@/components/create-book-form";
import { ImportBookForm } from "@/components/import-book-form";
import { useI18n } from "@/components/i18n-provider";
import { fetchBooksClient } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import type { BookSummary, ImportResult } from "@/lib/types";

type BookshelfPageClientProps = {
  initialBooks: BookSummary[];
};

export function BookshelfPageClient({ initialBooks }: BookshelfPageClientProps) {
  const { t } = useI18n();
  const [books, setBooks] = useState(initialBooks);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  async function refreshBooks() {
    try {
      setIsRefreshing(true);
      setRefreshError("");
      const latestBooks = await fetchBooksClient();
      setBooks(latestBooks);
      return latestBooks;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      setRefreshError(formatMessage(t("bookshelfRefreshFailed"), { message }));
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshBooks();
  }, []);

  async function handleBookCreated() {
    await refreshBooks();
  }

  async function handleBookImported(_result: ImportResult) {
    await refreshBooks();
  }

  async function handleBookDeleted() {
    await refreshBooks();
  }

  return (
    <main className="app-page">
      <section className="hero panel bookshelf-hero">
        <div className="page-masthead-copy">
          <p className="eyebrow">{t("bookshelfEyebrow")}</p>
          <h1>{t("bookshelfTitle")}</h1>
          <p className="lede">{t("bookshelfDescription")}</p>
        </div>
        <CreateBookForm onSuccess={handleBookCreated} />
      </section>

      <section className="panel section-panel collection-panel">
        <div className="section-header">
          <div>
            <h2>{t("importEyebrow")}</h2>
            <p>{t("bookshelfDescription")}</p>
          </div>
        </div>
        <div className="import-grid">
          <ImportBookForm
            accept=".txt,text/plain"
            description={t("importTxtDescription")}
            endpoint="txt"
            onSuccess={handleBookImported}
            title={t("importTxtTitle")}
          />
          <ImportBookForm
            accept=".epub,application/epub+zip"
            description={t("importEpubDescription")}
            endpoint="epub"
            onSuccess={handleBookImported}
            title={t("importEpubTitle")}
          />
        </div>
      </section>

      <BookshelfSection
        books={books}
        isRefreshing={isRefreshing}
        onDeleted={handleBookDeleted}
        refreshError={refreshError}
      />
    </main>
  );
}
