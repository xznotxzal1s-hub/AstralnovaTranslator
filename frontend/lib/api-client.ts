import type {
  BookSummary,
  ChapterCreateInput,
  GlossaryEntry,
  ImportResult,
  TranslationPreset,
  TranslationSettings,
} from "@/lib/types";

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
  return request<BookSummary>("/books", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updateBook(bookId: number, title: string) {
  return request<BookSummary>(`/books/${bookId}`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}

export async function fetchBooksClient() {
  return request<BookSummary[]>("/books", {
    method: "GET",
  });
}

export async function deleteBook(bookId: number) {
  const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function createChapter(bookId: number, payload: ChapterCreateInput) {
  return request(`/books/${bookId}/chapters`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteChapter(chapterId: number) {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function translateChapter(chapterId: number) {
  return request(`/chapters/${chapterId}/translate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function importBookFile(input: {
  endpoint: "txt" | "epub";
  file: File;
  bookTitle?: string;
}): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", input.file);
  if (input.bookTitle) {
    formData.append("book_title", input.bookTitle);
  }

  const response = await fetch(`${API_BASE_URL}/import/${input.endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<ImportResult>;
}

export async function updateSettings(payload: {
  provider_type: TranslationSettings["provider_type"];
  api_base_url: string;
  api_key: string;
  model_name: string;
  prompt_template: string;
  chunk_size: number;
  translation_mode: string;
}) {
  return request<TranslationSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function createSettingsPreset(payload: {
  name: string;
  provider_type: TranslationSettings["provider_type"];
  api_base_url: string;
  api_key: string;
  model_name: string;
  prompt_template: string;
  chunk_size: number;
  translation_mode: string;
}) {
  return request<TranslationPreset>("/settings/presets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSettingsPreset(
  presetId: number,
  payload: {
    name: string;
    provider_type: TranslationSettings["provider_type"];
    api_base_url: string;
    api_key: string;
    model_name: string;
    prompt_template: string;
    chunk_size: number;
    translation_mode: string;
  },
) {
  return request<TranslationPreset>(`/settings/presets/${presetId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function activateSettingsPreset(presetId: number) {
  return request<TranslationPreset>(`/settings/presets/${presetId}/activate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function deleteSettingsPreset(presetId: number) {
  const response = await fetch(`${API_BASE_URL}/settings/presets/${presetId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function createGlossaryEntry(payload: {
  source_term: string;
  target_term: string;
  note?: string;
  bookId?: number;
}) {
  const path = payload.bookId ? `/books/${payload.bookId}/glossary` : "/glossary";

  return request<GlossaryEntry>(path, {
    method: "POST",
    body: JSON.stringify({
      source_term: payload.source_term,
      target_term: payload.target_term,
      note: payload.note,
    }),
  });
}

export async function updateGlossaryEntry(
  entryId: number,
  payload: {
    source_term: string;
    target_term: string;
    note?: string;
  },
) {
  return request<GlossaryEntry>(`/glossary/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteGlossaryEntry(entryId: number) {
  const response = await fetch(`${API_BASE_URL}/glossary/${entryId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
