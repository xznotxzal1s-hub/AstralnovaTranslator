import { notFound } from "next/navigation";

import { BatchTranslateButton } from "@/components/batch-translate-button";
import { BookTitleEditor } from "@/components/book-title-editor";
import { ChapterCard } from "@/components/chapter-card";
import { CreateChapterForm } from "@/components/create-chapter-form";
import { DeleteBookButton } from "@/components/delete-book-button";
import { EmptyState } from "@/components/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PaginationControls } from "@/components/ui/pagination";
import { fetchBook, fetchBookChapters, fetchReadingProgress } from "@/lib/api";
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

export default async function BookDetailPage({ params, searchParams }: BookDetailPageProps) {
  const { bookId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsedBookId = Number(bookId);

  if (Number.isNaN(parsedBookId)) {
    notFound();
  }

  const [book, chapters, readingProgress] = await Promise.all([
    fetchBook(parsedBookId),
    fetchBookChapters(parsedBookId),
    fetchReadingProgress(parsedBookId),
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
  const hasActiveChapterFilters = Boolean(searchQuery) || statusFilter !== "all";
  const continueChapter =
    chapters.find((chapter) => chapter.id === readingProgress.chapter_id) ?? chapters[0] ?? null;
  const continueLabel = readingProgress.chapter_id ? messages.continueReadingButton : messages.startReadingButton;

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
                {continueChapter ? (
                  <ButtonLink variant="primary" href={`/books/${book.id}/chapters/${continueChapter.id}`}>
                    {continueLabel}
                  </ButtonLink>
                ) : null}
                <ButtonLink href="/">
                  {messages.backToBookshelf}
                </ButtonLink>
                <ButtonLink href={`/books/${book.id}/glossary`}>
                  {messages.manageBookGlossary}
                </ButtonLink>
              </div>
              {continueChapter ? (
                <p className="chapter-page-meta">
                  {formatMessage(messages.readingProgressLabel, {
                    progress: readingProgress.chapter_id ? readingProgress.progress_percent : 0,
                  })}
                </p>
              ) : null}
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
                <FormField
                  className="chapter-search-field"
                  htmlFor="chapter-search"
                  label={messages.chapterSearchLabel}
                >
                  <input
                    id="chapter-search"
                    name="q"
                    placeholder={messages.chapterSearchPlaceholder}
                    type="search"
                    defaultValue={searchQuery}
                  />
                </FormField>
                <FormField
                  className="chapter-status-field"
                  htmlFor="chapter-status"
                  label={messages.chapterStatusFilterLabel}
                >
                  <select id="chapter-status" name="status" defaultValue={statusFilter}>
                    <option value="all">{messages.chapterFilterAll}</option>
                    <option value="pending">{messages.chapterFilterPending}</option>
                    <option value="translated">{messages.chapterFilterTranslated}</option>
                    <option value="failed">{messages.chapterFilterFailed}</option>
                  </select>
                </FormField>
                <div className="chapter-filter-actions">
                  <Button variant="secondary" type="submit">
                    {messages.chapterFilterApply}
                  </Button>
                  {hasActiveChapterFilters ? (
                    <ButtonLink href={`/books/${book.id}`}>
                      {messages.chapterFilterClear}
                    </ButtonLink>
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

                <PaginationControls
                  ariaLabel={messages.chapterPaginationLabel}
                  currentPage={currentPage}
                  getHref={getChapterListHref}
                  nextLabel={messages.nextPage}
                  previousLabel={messages.previousPage}
                  statusText={formatMessage(messages.chapterPaginationStatus, {
                    current: currentPage,
                    total: totalPages,
                  })}
                  title={messages.chapterPaginationLabel}
                  totalPages={totalPages}
                />
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
              <ButtonLink href={`/books/${book.id}/glossary`}>
                {messages.manageBookGlossary}
              </ButtonLink>
              <DeleteBookButton bookId={book.id} redirectToBookshelf title={book.title} />
            </div>
          </section>
          <CreateChapterForm bookId={book.id} />
        </aside>
      </section>
    </main>
  );
}
