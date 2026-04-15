import Link from "next/link";
import { notFound } from "next/navigation";

import { ChapterCard } from "@/components/chapter-card";
import { CreateChapterForm } from "@/components/create-chapter-form";
import { EmptyState } from "@/components/empty-state";
import { fetchBook, fetchBookChapters } from "@/lib/api";

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

  return (
    <main className="app-page">
      <section className="panel hero">
        <div>
          <p className="eyebrow">Book Detail</p>
          <h1>{book.title}</h1>
          <p className="lede">
            Add a chapter by pasting Japanese text, then open a chapter to read or translate it.
          </p>
          <div className="action-row">
            <Link className="button-link" href="/">
              Back to bookshelf
            </Link>
          </div>
        </div>
        <CreateChapterForm bookId={book.id} />
      </section>

      <section className="section-header">
        <div>
          <h2>Chapters</h2>
          <p>{chapters.length} chapter{chapters.length === 1 ? "" : "s"} in this book.</p>
        </div>
      </section>

      {chapters.length === 0 ? (
        <EmptyState
          title="No chapters yet"
          description="Paste Japanese text into the chapter form above to create the first chapter."
        />
      ) : (
        <section className="list-stack">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} bookId={book.id} chapter={chapter} />
          ))}
        </section>
      )}
    </main>
  );
}
