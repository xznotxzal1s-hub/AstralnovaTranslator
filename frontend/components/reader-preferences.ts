export type ReadMode = "translation-only" | "bilingual" | "source-only";
export type ReaderTheme = "paper" | "sepia" | "dark";

export type ReaderPreferences = {
  fontSize: number;
  lineHeight: number;
  contentWidth: number;
  paragraphSpacing: number;
  theme: ReaderTheme;
  mode: ReadMode;
};

export const READER_PREFERENCES_STORAGE_KEY = "astralnova.readerPreferences.v1";

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontSize: 18,
  lineHeight: 2.05,
  contentWidth: 860,
  paragraphSpacing: 1,
  theme: "paper",
  mode: "translation-only",
};

const READ_MODES: ReadMode[] = ["translation-only", "bilingual", "source-only"];
const READER_THEMES: ReaderTheme[] = ["paper", "sepia", "dark"];

function clampNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, minimum), maximum);
}

export function normalizeReadMode(value: unknown): ReadMode {
  if (value === "source-and-translation") {
    return "bilingual";
  }

  return READ_MODES.includes(value as ReadMode) ? (value as ReadMode) : DEFAULT_READER_PREFERENCES.mode;
}

function normalizeReaderTheme(value: unknown): ReaderTheme {
  return READER_THEMES.includes(value as ReaderTheme) ? (value as ReaderTheme) : DEFAULT_READER_PREFERENCES.theme;
}

export function parseReaderPreferences(value: string | null): ReaderPreferences {
  if (!value) {
    return DEFAULT_READER_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ReaderPreferences> & { mode?: unknown };
    return {
      fontSize: clampNumber(parsed.fontSize, DEFAULT_READER_PREFERENCES.fontSize, 15, 24),
      lineHeight: clampNumber(parsed.lineHeight, DEFAULT_READER_PREFERENCES.lineHeight, 1.6, 2.6),
      contentWidth: clampNumber(parsed.contentWidth, DEFAULT_READER_PREFERENCES.contentWidth, 620, 1040),
      paragraphSpacing: clampNumber(parsed.paragraphSpacing, DEFAULT_READER_PREFERENCES.paragraphSpacing, 0.6, 1.8),
      theme: normalizeReaderTheme(parsed.theme),
      mode: normalizeReadMode(parsed.mode),
    };
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

export function getNextReadMode(mode: ReadMode): ReadMode {
  const currentIndex = READ_MODES.indexOf(mode);
  return READ_MODES[(currentIndex + 1) % READ_MODES.length] ?? DEFAULT_READER_PREFERENCES.mode;
}
