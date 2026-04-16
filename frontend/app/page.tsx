import { BookshelfSection } from "@/components/bookshelf-section";
import { CreateBookForm } from "@/components/create-book-form";
import { ImportBookForm } from "@/components/import-book-form";
import { fetchBooks } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const books = await fetchBooks();
  const { messages } = await getServerI18n();

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

      <BookshelfSection initialBooks={books} />
    </main>
  );
}
