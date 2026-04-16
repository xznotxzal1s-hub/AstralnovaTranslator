import { BookCard } from "@/components/book-card";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/components/i18n-provider";
import { formatMessage } from "@/lib/i18n";
import type { BookSummary } from "@/lib/types";

type BookshelfSectionProps = {
  books: BookSummary[];
  isRefreshing?: boolean;
  refreshError?: string;
  onDeleted?: (bookId: number) => void | Promise<void>;
};

export function BookshelfSection({
  books,
  isRefreshing = false,
  refreshError = "",
  onDeleted,
}: BookshelfSectionProps) {
  const { t } = useI18n();
  const bookLabel = books.length === 1 ? t("bookSingular") : t("bookPlural");

  return (
    <section className="panel section-panel bookshelf-library-panel">
      <div className="section-header">
        <div>
          <h2>{t("booksHeading")}</h2>
          <p>{formatMessage(t("booksCount"), { count: books.length, label: bookLabel })}</p>
        </div>
      </div>

      {isRefreshing ? <p className="feedback">{t("bookshelfSyncing")}</p> : null}
      {refreshError ? <p className="feedback error">{refreshError}</p> : null}

      {books.length === 0 ? (
        <EmptyState title={t("noBooksTitle")} description={t("noBooksDescription")} />
      ) : (
        <section className="book-grid">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onDeleted={onDeleted} />
          ))}
        </section>
      )}
    </section>
  );
}
