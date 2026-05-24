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
  const latestBook = books[0] ?? null;

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
    <main className="app-page home-page">
      <section className="bookshelf-shell">
        <section className="bookshelf-stage">
          <div className="bookshelf-hero-copy">
            <p className="eyebrow">{t("bookshelfEyebrow")}</p>
            <h1>{t("bookshelfTitle")}</h1>
            <p className="lede">{t("bookshelfDescription")}</p>
            <div className="home-metrics" aria-label={t("bookshelfOverviewLabel")}>
              <div className="home-metric-primary">
                <span>{books.length}</span>
                <p>{books.length === 1 ? t("bookSingular") : t("bookPlural")}</p>
              </div>
              <div className="home-metric-copy">
                <p className="eyebrow">{t("bookshelfLocalArchiveLabel")}</p>
                <p>{t("bookshelfLocalArchiveText")}</p>
              </div>
            </div>
          </div>

          <aside className="bookshelf-command-panel">
            <div className="command-panel-copy">
              <p className="eyebrow">{t("bookshelfReadingDeskLabel")}</p>
              <h2>{t("bookshelfReadingDeskTitle")}</h2>
              <p className="muted">{t("bookshelfReadingDeskBody")}</p>
            </div>
            <div className="latest-book-strip">
              <span className="latest-book-index">01</span>
              <div>
                <p className="eyebrow">{t("bookshelfLastUpdatedLabel")}</p>
                <p>{latestBook ? latestBook.title : t("bookshelfNoRecentBook")}</p>
              </div>
            </div>
            <ImportWorkspace onChanged={handleBookCreated} />
          </aside>
        </section>

        <BookshelfSection
          books={books}
          isRefreshing={isRefreshing}
          onDeleted={handleBookDeleted}
          refreshError={refreshError}
        />
      </section>
    </main>
  );
}
