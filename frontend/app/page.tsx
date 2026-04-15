import { BookCard } from "@/components/book-card";
import { CreateBookForm } from "@/components/create-book-form";
import { EmptyState } from "@/components/empty-state";
import { fetchBooks } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const books = await fetchBooks();

  return (
    <main className="app-page">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Bookshelf</p>
          <h1>Your private reading shelf</h1>
          <p className="lede">
            Create books, open chapters, and start translation from a simple reading-focused
            interface.
          </p>
        </div>
        <CreateBookForm />
      </section>

      <section className="section-header">
        <div>
          <h2>Books</h2>
          <p>{books.length} book{books.length === 1 ? "" : "s"} stored locally.</p>
        </div>
      </section>

      {books.length === 0 ? (
        <EmptyState
          title="No books yet"
          description="Create your first book above. TXT and EPUB import can be added in a later phase."
        />
      ) : (
        <section className="book-grid">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </section>
      )}
    </main>
  );
}
