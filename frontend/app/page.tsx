import { BookshelfPageClient } from "@/components/bookshelf-page-client";
import { fetchBooks } from "@/lib/api";
import type { BookSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let books: BookSummary[] = [];
  let initialRefreshError = "";

  try {
    books = await fetchBooks();
  } catch (error) {
    initialRefreshError = error instanceof Error ? error.message : "Request failed.";
  }

  return <BookshelfPageClient initialBooks={books} initialRefreshError={initialRefreshError} />;
}
