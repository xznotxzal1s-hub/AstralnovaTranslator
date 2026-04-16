import { BookshelfPageClient } from "@/components/bookshelf-page-client";
import { fetchBooks } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const books = await fetchBooks();

  return <BookshelfPageClient initialBooks={books} />;
}
