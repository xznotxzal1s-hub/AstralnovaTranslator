"use client";

import { useEffect, useState } from "react";

import { BookshelfSection } from "@/components/bookshelf-section";
import { ImportWorkspace } from "@/components/import-workspace";
import { useI18n } from "@/components/i18n-provider";
import { fetchBooksClient } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import type { BookSummary } from "@/lib/types";

type BookshelfPageClientProps = {
  initialBooks: BookSummary[];
  initialRefreshError?: string;
};

export function BookshelfPageClient({ initialBooks, initialRefreshError = "" }: BookshelfPageClientProps) {
  const { t } = useI18n();
  const [books, setBooks] = useState(initialBooks);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(() =>
    initialRefreshError ? formatMessage(t("bookshelfRefreshFailed"), { message: initialRefreshError }) : "",
  );

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

  async function handleBookDeleted() {
    await refreshBooks();
  }

  return (
    <main className="app-page">
      <section className="panel section-panel bookshelf-shell">
        <div className="bookshelf-main">
          <section className="bookshelf-header">
            <div className="page-masthead-copy">
              <p className="eyebrow">{t("bookshelfEyebrow")}</p>
              <h1>{t("bookshelfTitle")}</h1>
              <p className="lede">{t("bookshelfDescription")}</p>
            </div>
            <ImportWorkspace onChanged={handleBookCreated} />
          </section>

          <BookshelfSection
            books={books}
            isRefreshing={isRefreshing}
            onDeleted={handleBookDeleted}
            refreshError={refreshError}
          />
        </div>
      </section>
    </main>
  );
}
