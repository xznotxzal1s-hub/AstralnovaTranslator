import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { ReadModePanel } from "@/components/read-mode-panel";
import { TranslateChapterButton } from "@/components/translate-chapter-button";
import { fetchBook, fetchBookChapters, fetchChapter } from "@/lib/api";
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

  const [book, chapter, chapters] = await Promise.all([
    fetchBook(parsedBookId),
    fetchChapter(parsedChapterId),
    fetchBookChapters(parsedBookId),
  ]);
  const { messages } = await getServerI18n();
  const localizedStatus = getLocalizedStatus(chapter.translation_status, messages);

  const currentIndex = chapters.findIndex((item) => item.id === chapter.id);
  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

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
                <span className={`stat-chip status-pill ${chapter.translation_status}`}>
                  {formatMessage(messages.statusLabel, { status: localizedStatus })}
                </span>
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

          <section className="reader-card reading-surface desktop-reading-surface">
            {chapter.source_text ? (
              <ReadModePanel chapter={chapter} />
            ) : (
              <EmptyState title={messages.noSourceTitle} description={messages.noSourceDescription} />
            )}
          </section>
        </div>

        <aside className="sidebar-stack reader-sidebar desktop-reader-sidebar">
          <section className="form-card reader-nav-card">
            <div className="reader-nav-header">
              <p className="eyebrow">{messages.readingPageOutline}</p>
              <h3>{messages.navigationHeading}</h3>
              <p className="muted">{messages.readingPageDescription}</p>
            </div>
            <div className="reader-outline">
              {chapters.map((item) => (
                <Link
                  key={item.id}
                  className={`chapter-nav-link${item.id === chapter.id ? " active" : ""}`}
                  href={`/books/${book.id}/chapters/${item.id}`}
                >
                  <span className="chapter-nav-index">{item.index_in_book}</span>
                  <span className="chapter-nav-copy">{item.title}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
