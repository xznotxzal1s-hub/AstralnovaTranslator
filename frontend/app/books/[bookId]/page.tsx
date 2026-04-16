import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchTranslateButton } from "@/components/batch-translate-button";
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
};

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { bookId } = await params;
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

  return (
    <main className="app-page">
      <section className="panel section-panel">
        <div className="detail-hero">
          <div className="detail-summary">
            <p className="eyebrow">{messages.bookDetailEyebrow}</p>
            <h1>{book.title}</h1>
            <p className="lede">{messages.bookDetailDescription}</p>
            <div className="summary-meta">
              <span className="stat-chip">{formatMessage(messages.chaptersCount, { count: chapters.length, label: chapterLabel })}</span>
              <span className="stat-chip">{new Date(book.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="action-row">
              <Link className="button-link" href="/">
                {messages.backToBookshelf}
              </Link>
              <Link className="button-link" href={`/books/${book.id}/glossary`}>
                {messages.manageBookGlossary}
              </Link>
              <DeleteBookButton bookId={book.id} redirectToBookshelf title={book.title} />
            </div>
          </div>
          <CreateChapterForm bookId={book.id} />
        </div>
      </section>

      <section className="panel section-panel">
        <div className="section-header">
          <div>
            <h2>{messages.chaptersHeading}</h2>
            <p>{formatMessage(messages.chaptersCount, { count: chapters.length, label: chapterLabel })}</p>
          </div>
          {chapters.length > 0 ? <BatchTranslateButton chapters={chapters} /> : null}
        </div>

        {chapters.length === 0 ? (
          <EmptyState title={messages.noChaptersTitle} description={messages.noChaptersDescription} />
        ) : (
          <section className="list-stack chapter-list">
            {chapters.map((chapter) => (
              <ChapterCard key={chapter.id} bookId={book.id} chapter={chapter} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
