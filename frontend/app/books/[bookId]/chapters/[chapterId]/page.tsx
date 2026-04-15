import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { ReadModePanel } from "@/components/read-mode-panel";
import { TranslateChapterButton } from "@/components/translate-chapter-button";
import { fetchBook, fetchBookChapters, fetchChapter } from "@/lib/api";

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

  const currentIndex = chapters.findIndex((item) => item.id === chapter.id);
  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <main className="app-page">
      <section className="reader-layout">
        <aside className="sidebar-stack">
          <section className="form-card">
            <p className="eyebrow">Chapter</p>
            <h2>{chapter.title}</h2>
            <p className="muted">{book.title}</p>
            <div className="status-row">
              <span className="pill">Status: {chapter.translation_status}</span>
              <span className="pill">Chapter {chapter.index_in_book}</span>
            </div>
            <TranslateChapterButton chapterId={chapter.id} />
          </section>

          <section className="form-card">
            <h3>Navigation</h3>
            <div className="action-row">
              <Link className="button-link" href={`/books/${book.id}`}>
                Back to book
              </Link>
              {previousChapter ? (
                <Link className="button-link" href={`/books/${book.id}/chapters/${previousChapter.id}`}>
                  Previous chapter
                </Link>
              ) : null}
              {nextChapter ? (
                <Link className="button-link" href={`/books/${book.id}/chapters/${nextChapter.id}`}>
                  Next chapter
                </Link>
              ) : null}
            </div>
          </section>

          <section className="form-card">
            <h3>All chapters</h3>
            <div className="list-stack">
              {chapters.map((item) => (
                <Link key={item.id} className="button-link" href={`/books/${book.id}/chapters/${item.id}`}>
                  {item.index_in_book}. {item.title}
                </Link>
              ))}
            </div>
          </section>
        </aside>

        <section className="reader-card">
          <div className="reader-header">
            <div>
              <p className="eyebrow">Reading Page</p>
              <h1>{chapter.title}</h1>
              <p className="muted">Read the original text and the saved translation.</p>
            </div>
          </div>

          {chapter.source_text ? (
            <ReadModePanel chapter={chapter} />
          ) : (
            <EmptyState
              title="This chapter has no source text"
              description="Add source text on the book detail page before reading or translating."
            />
          )}
        </section>
      </section>
    </main>
  );
}
