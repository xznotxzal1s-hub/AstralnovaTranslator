import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { ReaderExperience } from "@/components/reader-experience";
import { TranslateChapterButton } from "@/components/translate-chapter-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchBook, fetchBookChapters, fetchChapter, fetchReadingProgress } from "@/lib/api";
import { formatMessage } from "@/lib/i18n";
import { getServerI18n } from "@/lib/i18n-server";
import { getLocalizedStatus } from "@/lib/status-label";

export const dynamic = "force-dynamic";

type ChapterPageProps = {
  params: Promise<{
    bookId: string;
    chapterId: string;
  }>;
};

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { bookId, chapterId } = await params;
  const parsedBookId = Number(bookId);
  const parsedChapterId = Number(chapterId);

  if (Number.isNaN(parsedBookId) || Number.isNaN(parsedChapterId)) {
    notFound();
  }

  const [book, chapter, chapters, readingProgress] = await Promise.all([
    fetchBook(parsedBookId),
    fetchChapter(parsedChapterId),
    fetchBookChapters(parsedBookId),
    fetchReadingProgress(parsedBookId),
  ]);
  const { messages } = await getServerI18n();
  const localizedStatus = getLocalizedStatus(chapter.translation_status, messages);

  const currentIndex = chapters.findIndex((item) => item.id === chapter.id);
  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const outlineStartIndex = Math.max(0, safeCurrentIndex - 5);
  const outlineEndIndex = Math.min(chapters.length, safeCurrentIndex + 6);
  const outlineChapters = chapters.slice(outlineStartIndex, outlineEndIndex);
  const firstChapter = chapters[0] ?? null;
  const lastChapter = chapters[chapters.length - 1] ?? null;
  const readerPosition = formatMessage(messages.readerChapterPosition, {
    current: safeCurrentIndex + 1,
    total: chapters.length,
  });

  type NavigationChapter = (typeof chapters)[number];

  function renderChapterStepLink(target: NavigationChapter | null, label: string, unavailableLabel: string, direction: string) {
    if (!target) {
      return (
        <span className={`reader-step-link ${direction} is-disabled`}>
          <span>{label}</span>
          <strong>{unavailableLabel}</strong>
        </span>
      );
    }

    return (
      <Link className={`reader-step-link ${direction}`} href={`/books/${book.id}/chapters/${target.id}`}>
        <span>{label}</span>
        <strong>{target.title}</strong>
      </Link>
    );
  }

  return (
    <main className="app-page reader-page">
      <section className="panel section-panel reader-shell">
        <div className="reader-main-column">
          <section className="reader-header panel compact-reader-header">
            <div className="reader-hero-main reader-header-copy">
              <p className="eyebrow">{messages.readingPageEyebrow}</p>
              <div className="reader-title-block">
                <h1>{chapter.title}</h1>
                <p className="reader-subtitle">{book.title}</p>
              </div>
              <p className="reader-lead">{messages.readingPageLead}</p>
              <div className="summary-meta">
                <span className="stat-chip">
                  {formatMessage(messages.chapterEyebrow, { count: chapter.index_in_book })}
                </span>
                <StatusBadge className="stat-chip" status={chapter.translation_status} withPill={false}>
                  {formatMessage(messages.statusLabel, { status: localizedStatus })}
                </StatusBadge>
              </div>
            </div>
            <div className="reader-header-actions">
              <TranslateChapterButton chapterId={chapter.id} />
              <div className="reader-jump-links">
                <Link className="button-link" href={`/books/${book.id}`}>
                  {messages.backToBook}
                </Link>
                {previousChapter ? (
                  <Link className="button-link" href={`/books/${book.id}/chapters/${previousChapter.id}`}>
                    {messages.previousChapter}
                  </Link>
                ) : null}
                {nextChapter ? (
                  <Link className="button-link" href={`/books/${book.id}/chapters/${nextChapter.id}`}>
                    {messages.nextChapter}
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <nav className="reader-chapter-nav reader-chapter-nav-top" aria-label={messages.navigationHeading}>
            {renderChapterStepLink(
              previousChapter,
              messages.previousChapter,
              messages.readerNoPreviousChapter,
              "previous",
            )}
            <span className="reader-position-chip">{readerPosition}</span>
            {renderChapterStepLink(nextChapter, messages.nextChapter, messages.readerNoNextChapter, "next")}
          </nav>

          <section className="reader-card reading-surface desktop-reading-surface">
            {chapter.source_text ? (
              <ReaderExperience
                book={book}
                chapter={chapter}
                chapters={chapters}
                previousChapter={previousChapter}
                nextChapter={nextChapter}
                initialProgress={readingProgress}
              />
            ) : (
              <EmptyState title={messages.noSourceTitle} description={messages.noSourceDescription} />
            )}
          </section>

          <nav className="reader-chapter-nav reader-chapter-nav-bottom" aria-label={messages.navigationHeading}>
            {renderChapterStepLink(
              previousChapter,
              messages.previousChapter,
              messages.readerNoPreviousChapter,
              "previous",
            )}
            <Link className="reader-position-chip reader-position-link" href={`/books/${book.id}`}>
              {messages.backToBook}
            </Link>
            {renderChapterStepLink(nextChapter, messages.nextChapter, messages.readerNoNextChapter, "next")}
          </nav>
        </div>

        {previousChapter || nextChapter ? (
          <nav className="reader-floating-nav" aria-label={messages.navigationHeading}>
            {previousChapter ? (
              <Link className="reader-floating-link" href={`/books/${book.id}/chapters/${previousChapter.id}`}>
                {messages.previousChapter}
              </Link>
            ) : null}
            {nextChapter ? (
              <Link className="reader-floating-link" href={`/books/${book.id}/chapters/${nextChapter.id}`}>
                {messages.nextChapter}
              </Link>
            ) : null}
          </nav>
        ) : null}

        <aside className="sidebar-stack reader-sidebar desktop-reader-sidebar">
          <section className="form-card reader-nav-card">
            <div className="reader-nav-header">
              <p className="eyebrow">{messages.readingPageOutline}</p>
              <h3>{messages.navigationHeading}</h3>
              <p className="muted">{messages.readingPageDescription}</p>
              <p className="reader-outline-window">
                {formatMessage(messages.chapterPageRange, {
                  from: outlineStartIndex + 1,
                  to: outlineEndIndex,
                  count: chapters.length,
                })}
              </p>
            </div>
            <div className="reader-outline">
              {firstChapter && outlineStartIndex > 0 ? (
                <Link
                  className="chapter-nav-link chapter-nav-boundary"
                  href={`/books/${book.id}/chapters/${firstChapter.id}`}
                >
                  <span className="chapter-nav-index">{firstChapter.index_in_book}</span>
                  <span className="chapter-nav-copy">{firstChapter.title}</span>
                </Link>
              ) : null}
              {outlineStartIndex > 1 ? <span className="chapter-nav-gap">...</span> : null}
              {outlineChapters.map((item) => (
                <Link
                  key={item.id}
                  className={`chapter-nav-link${item.id === chapter.id ? " active" : ""}`}
                  href={`/books/${book.id}/chapters/${item.id}`}
                >
                  <span className="chapter-nav-index">{item.index_in_book}</span>
                  <span className="chapter-nav-copy">{item.title}</span>
                </Link>
              ))}
              {outlineEndIndex < chapters.length - 1 ? <span className="chapter-nav-gap">...</span> : null}
              {lastChapter && outlineEndIndex < chapters.length ? (
                <Link
                  className="chapter-nav-link chapter-nav-boundary"
                  href={`/books/${book.id}/chapters/${lastChapter.id}`}
                >
                  <span className="chapter-nav-index">{lastChapter.index_in_book}</span>
                  <span className="chapter-nav-copy">{lastChapter.title}</span>
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
