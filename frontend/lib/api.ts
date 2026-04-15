import { BookDetail, BookSummary, Chapter, GlossaryEntry, TranslationSettings } from "@/lib/types";

const API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchBooks(): Promise<BookSummary[]> {
  return request<BookSummary[]>("/books");
}

export async function fetchBook(bookId: number): Promise<BookDetail> {
  return request<BookDetail>(`/books/${bookId}`);
}

export async function fetchBookChapters(bookId: number): Promise<Chapter[]> {
  return request<Chapter[]>(`/books/${bookId}/chapters`);
}

export async function fetchChapter(chapterId: number): Promise<Chapter> {
  return request<Chapter>(`/chapters/${chapterId}`);
}

export async function fetchSettings(): Promise<TranslationSettings> {
  return request<TranslationSettings>("/settings");
}

export async function fetchGlossaryEntries(): Promise<GlossaryEntry[]> {
  return request<GlossaryEntry[]>("/glossary");
}

export async function fetchBookGlossaryEntries(bookId: number): Promise<GlossaryEntry[]> {
  return request<GlossaryEntry[]>(`/books/${bookId}/glossary`);
}
