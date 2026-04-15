import type { ChapterCreateInput } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string };
    if (data.detail) {
      return data.detail;
    }
  } catch {
    return "Request failed.";
  }

  return "Request failed.";
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
}

export async function createBook(title: string) {
  return request("/books", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function createChapter(bookId: number, payload: ChapterCreateInput) {
  return request(`/books/${bookId}/chapters`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function translateChapter(chapterId: number) {
  return request(`/chapters/${chapterId}/translate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
