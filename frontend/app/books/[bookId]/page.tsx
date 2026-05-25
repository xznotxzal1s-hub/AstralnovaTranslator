import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchTranslateButton } from "@/components/batch-translate-button";
import { BookTitleEditor } from "@/components/book-title-editor";
import { ChapterCard } from "@/components/chapter-card";
import { CreateChapterForm } from "@/components/create-chapter-form";
import { DeleteBookButton } from "@/components/delete-book-button";
import { EmptyState } from "@/components/empty-state";
import { fetchBook, fetchBookChapters } from "@/lib/api";
import { formatMessage } from "@/lib/i18n";
import { getServerI18n } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type BookDetailPageProps = {
  params: Promise<{
    bookId: string;
  }>;
  searchParams?: Promise<{
    page?: string;
    q?: string;
    status?: string;
  }>;
};

const CHAPTERS_PER_PAGE = 12;
const CHAPTER_STATUS_FILTERS = ["all", "pending", "translated", "failed"] as const;
type ChapterStatusFilter = (typeof CHAPTER_STATUS_FILTERS)[number];

function getChapterStatusFilter(value: string | undefined): ChapterStatusFilter {
  return CHAPTER_STATUS_FILTERS.includes(value as ChapterStatusFilter) ? (value as ChapterStatusFilter) : "all";
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | "gap-start" | "gap-end"> {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const normalizedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  return normalizedPages.flatMap((page, index) => {
    const previousPage = normalizedPages[index - 1];
    if (previousPage && page - previousPage > 1) {
      return [previousPage === 1 ? "gap-start" : "gap-end", page];
    }

    return [page];
  });
}

export default async function BookDetailPage({ params, searchParams }: BookDetailPageProps) {
  const { bookId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsedBookId = Number(bookId);

  if (Number.isNaN(parsedBookId)) {
    notFound();
  }

  const [book, chapters] = await Promise.all([
    fetchBook(parsedBookId),
    fetchBookChapters(parsedBookId),
  ]);
  const { messages } = await getServerI18n();
  const chapterLabel = chapters.length === 1 ? messages.chapterSingular : messages.chapterPlural;
  const searchQuery = (resolvedSearchParams?.q ?? "").trim();
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const statusFilter = getChapterStatusFilter(resolvedSearchParams?.status);
  const filteredChapters = chapters.filter((chapter) => {
    const matchesStatus = statusFilter === "all" || chapter.translation_status === statusFilter;
    const matchesSearch = !normalizedSearchQuery || chapter.title.toLowerCase().includes(normalizedSearchQuery);
    return matchesStatus && matchesSearch;
  });
  const filteredChapterLabel = filteredChapters.length === 1 ? messages.chapterSingular : messages.chapterPlural;
  const totalPages = Math.max(1, Math.ceil(filteredChapters.length / CHAPTERS_PER_PAGE));
  const requestedPage = Number(resolvedSearchParams?.page ?? "1");
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, Math.floor(requestedPage)), totalPages)
    : 1;
  const startIndex = (currentPage - 1) * CHAPTERS_PER_PAGE;
  const pagedChapters = filteredChapters.slice(startIndex, startIndex + CHAPTERS_PER_PAGE);
  const rangeStart = filteredChapters.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = filteredChapters.length === 0 ? 0 : startIndex + pagedChapters.length;
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const hasActiveChapterFilters = Boolean(searchQuery) || statusFilter !== "all";

  function getChapterListHref(page: number) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (searchQuery) {
      params.set("q", searchQuery);
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    return `/books/${book.id}?${params.toString()}`;
  }

  return (
    <main className="app-page">
      <section className="panel section-panel book-detail-shell">
        <div className="book-detail-main">
          <section className="book-detail-header">
            <div className="detail-summary compact-summary">
              <p className="eyebrow">{messages.bookDetailEyebrow}</p>
              <BookTitleEditor bookId={book.id} initialTitle={book.title} />
              <p className="lede">{messages.bookDetailDescription}</p>
              <div className="summary-meta">
                <span className="stat-chip">
                  {formatMessage(messages.chaptersCount, { count: chapters.length, label: chapterLabel })}
                </span>
                <span className="stat-chip">{new Date(book.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="action-row">
                <Link className="button-link" href="/">
                  {messages.backToBookshelf}
                </Link>
                <Link className="button-link" href={`/books/${book.id}/glossary`}>
                  {messages.manageBookGlossary}
                </Link>
              </div>
            </div>
          </section>

          <section className="panel section-panel chapter-management-panel desktop-primary-panel">
            <div className="section-header">
              <div>
                <h2>{messages.chaptersHeading}</h2>
                <p>{formatMessage(messages.chaptersCount, { count: chapters.length, label: chapterLabel })}</p>
                {hasActiveChapterFilters ? (
                  <p className="chapter-page-meta">
                    {formatMessage(messages.chapterFilteredCount, {
                      count: filteredChapters.length,
                      label: filteredChapterLabel,
                      total: chapters.length,
                    })}
                  </p>
                ) : null}
                {chapters.length > 0 ? (
                  <p className="chapter-page-meta">
                    {formatMessage(messages.chapterPageRange, {
                      from: rangeStart,
                      to: rangeEnd,
                      count: filteredChapters.length,
                    })}
                  </p>
                ) : null}
              </div>
              {chapters.length > 0 ? <BatchTranslateButton bookId={book.id} chapters={chapters} /> : null}
            </div>

            {chapters.length > 0 ? (
              <form action={`/books/${book.id}`} className="chapter-filter-bar">
                <div className="field chapter-search-field">
                  <label htmlFor="chapter-search">{messages.chapterSearchLabel}</label>
                  <input
                    id="chapter-search"
                    name="q"
                    placeholder={messages.chapterSearchPlaceholder}
                    type="search"
                    defaultValue={searchQuery}
                  />
                </div>
                <div className="field chapter-status-field">
                  <label htmlFor="chapter-status">{messages.chapterStatusFilterLabel}</label>
                  <select id="chapter-status" name="status" defaultValue={statusFilter}>
                    <option value="all">{messages.chapterFilterAll}</option>
                    <option value="pending">{messages.chapterFilterPending}</option>
                    <option value="translated">{messages.chapterFilterTranslated}</option>
                    <option value="failed">{messages.chapterFilterFailed}</option>
                  </select>
                </div>
                <div className="chapter-filter-actions">
                  <button className="button-secondary" type="submit">
                    {messages.chapterFilterApply}
                  </button>
                  {hasActiveChapterFilters ? (
                    <Link className="button-link" href={`/books/${book.id}`}>
                      {messages.chapterFilterClear}
                    </Link>
                  ) : null}
                </div>
              </form>
            ) : null}

            {chapters.length === 0 ? (
              <EmptyState title={messages.noChaptersTitle} description={messages.noChaptersDescription} />
            ) : filteredChapters.length === 0 ? (
              <EmptyState
                title={messages.chapterFilterNoResultsTitle}
                description={messages.chapterFilterNoResultsDescription}
              />
            ) : (
              <>
                <section className="list-stack chapter-list">
                  {pagedChapters.map((chapter) => (
                    <ChapterCard key={chapter.id} bookId={book.id} chapter={chapter} />
                  ))}
                </section>

                {totalPages > 1 ? (
                  <nav className="chapter-pagination" aria-label={messages.chapterPaginationLabel}>
                    <div className="chapter-pagination-copy">
                      <p className="eyebrow">{messages.chapterPaginationLabel}</p>
                      <p className="muted">
                        {formatMessage(messages.chapterPaginationStatus, {
                          current: currentPage,
                          total: totalPages,
                        })}
                      </p>
                    </div>
                    <div className="chapter-pagination-actions">
                      {currentPage > 1 ? (
                        <Link className="button-link pagination-link" href={getChapterListHref(currentPage - 1)}>
                          {messages.previousPage}
                        </Link>
                      ) : (
                        <span className="button-link pagination-link is-disabled">{messages.previousPage}</span>
                      )}
                      <div className="chapter-page-number-row">
                        {paginationItems.map((item) =>
                          typeof item === "number" ? (
                            item === currentPage ? (
                              <span
                                key={item}
                                aria-current="page"
                                className="button-link pagination-link pagination-number is-current"
                              >
                                {item}
                              </span>
                            ) : (
                              <Link
                                key={item}
                                className="button-link pagination-link pagination-number"
                                href={getChapterListHref(item)}
                              >
                                {item}
                              </Link>
                            )
                          ) : (
                            <span key={item} className="pagination-gap" aria-hidden="true">
                              ...
                            </span>
                          ),
                        )}
                      </div>
                      {currentPage < totalPages ? (
                        <Link className="button-link pagination-link" href={getChapterListHref(currentPage + 1)}>
                          {messages.nextPage}
                        </Link>
                      ) : (
                        <span className="button-link pagination-link is-disabled">{messages.nextPage}</span>
                      )}
                    </div>
                  </nav>
                ) : null}
              </>
            )}
          </section>
        </div>

        <aside className="book-detail-sidebar sidebar-stack">
          <section className="info-card detail-side-card">
            <p className="eyebrow">{messages.bookDetailEyebrow}</p>
            <h3>{messages.manageBookGlossary}</h3>
            <p className="muted">{messages.bookDetailDescription}</p>
            <div className="action-row">
              <Link className="button-link" href={`/books/${book.id}/glossary`}>
                {messages.manageBookGlossary}
              </Link>
              <DeleteBookButton bookId={book.id} redirectToBookshelf title={book.title} />
            </div>
          </section>
          <CreateChapterForm bookId={book.id} />
        </aside>
      </section>
    </main>
  );
}
