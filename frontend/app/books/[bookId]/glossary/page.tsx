import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { GlossaryManager } from "@/components/glossary-manager";
import { fetchBook, fetchBookGlossaryEntries } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type BookGlossaryPageProps = {
  params: Promise<{
    bookId: string;
  }>;
};

export default async function BookGlossaryPage({ params }: BookGlossaryPageProps) {
  const { bookId } = await params;
  const parsedBookId = Number(bookId);

  if (Number.isNaN(parsedBookId)) {
    notFound();
  }

  const [book, entries, { messages }] = await Promise.all([
    fetchBook(parsedBookId),
    fetchBookGlossaryEntries(parsedBookId),
    getServerI18n(),
  ]);

  return (
    <main className="app-page">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{messages.glossaryBookScope}</p>
          <h1>{book.title}</h1>
          <p className="lede">{messages.glossaryBookDescription}</p>
          <div className="action-row">
            <Link className="button-link" href={`/books/${book.id}`}>
              {messages.backToBook}
            </Link>
            <Link className="button-link" href="/glossary">
              {messages.navGlossary}
            </Link>
          </div>
        </div>
      </section>

      <GlossaryManager initialEntries={entries} scope="book" bookId={book.id} />

      {entries.length === 0 ? (
        <EmptyState title={messages.noGlossaryTitle} description={messages.noGlossaryDescription} />
      ) : null}
    </main>
  );
}
