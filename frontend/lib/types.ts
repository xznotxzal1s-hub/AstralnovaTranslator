export type BookSummary = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: number;
  book_id: number;
  index_in_book: number;
  title: string;
  source_text: string;
  translated_text: string | null;
  source_hash: string | null;
  translation_status: string;
  last_translated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookDetail = BookSummary & {
  chapters: Chapter[];
};

export type ChapterCreateInput = {
  title: string;
  source_text: string;
};

export type ImportResult = {
  book_id: number;
  book_title: string;
  chapter_count: number;
  chapters: Chapter[];
};

export type UrlImportInput = {
  url: string;
  bookTitle?: string;
};

export type TranslationSettings = {
  id: number;
  name: string;
  is_active: boolean;
  provider_type: "openai_compatible" | "gemini";
  api_base_url: string;
  model_name: string;
  api_key: string;
  prompt_template: string;
  chunk_size: number;
  translation_mode: string;
  updated_at: string;
};

export type TranslationPreset = TranslationSettings;

export type GlossaryEntry = {
  id: number;
  book_id: number | null;
  source_term: string;
  target_term: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};
