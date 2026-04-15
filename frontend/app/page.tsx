import { BookCard } from "@/components/book-card";
import { CreateBookForm } from "@/components/create-book-form";
import { EmptyState } from "@/components/empty-state";
import { ImportBookForm } from "@/components/import-book-form";
import { fetchBooks } from "@/lib/api";
import { formatMessage } from "@/lib/i18n";
import { getServerI18n } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const books = await fetchBooks();
  const { messages } = await getServerI18n();
  const bookLabel = books.length === 1 ? messages.bookSingular : messages.bookPlural;

  return (
    <main className="app-page">
      <section className="hero panel bookshelf-hero">
        <div>
          <p className="eyebrow">{messages.bookshelfEyebrow}</p>
          <h1>{messages.bookshelfTitle}</h1>
          <p className="lede">{messages.bookshelfDescription}</p>
        </div>
        <CreateBookForm />
      </section>

      <section className="panel section-panel">
        <div className="section-header">
          <div>
            <h2>{messages.importEyebrow}</h2>
            <p>{messages.bookshelfDescription}</p>
          </div>
        </div>
        <div className="import-grid">
          <ImportBookForm
            accept=".txt,text/plain"
            description={messages.importTxtDescription}
            endpoint="txt"
            title={messages.importTxtTitle}
          />
          <ImportBookForm
            accept=".epub,application/epub+zip"
            description={messages.importEpubDescription}
            endpoint="epub"
            title={messages.importEpubTitle}
          />
        </div>
      </section>

      <section className="panel section-panel">
        <div className="section-header">
          <div>
            <h2>{messages.booksHeading}</h2>
            <p>{formatMessage(messages.booksCount, { count: books.length, label: bookLabel })}</p>
          </div>
        </div>

        {books.length === 0 ? (
          <EmptyState title={messages.noBooksTitle} description={messages.noBooksDescription} />
        ) : (
          <section className="book-grid">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
