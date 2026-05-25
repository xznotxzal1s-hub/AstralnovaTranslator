"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { useI18n } from "@/components/i18n-provider";
import {
  DEFAULT_READER_PREFERENCES,
  READER_PREFERENCES_STORAGE_KEY,
  getNextReadMode,
  parseReaderPreferences,
  type ReadMode,
  type ReaderPreferences,
} from "@/components/reader-preferences";
import { ReadModePanel } from "@/components/read-mode-panel";
import { updateReadingProgress } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import type { BookSummary, Chapter, ReadingProgress } from "@/lib/types";

type ReaderExperienceProps = {
  book: BookSummary;
  chapter: Chapter;
  chapters: Chapter[];
  previousChapter: Chapter | null;
  nextChapter: Chapter | null;
  initialProgress: ReadingProgress;
};

const SAVE_INTERVAL_MS = 3000;
const MEANINGFUL_PROGRESS_DELTA = 2;
const MAX_SEARCH_RESULTS = 50;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function getScrollPercent() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollableHeight <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollableHeight) * 100)));
}

export function ReaderExperience({
  book,
  chapter,
  chapters,
  previousChapter,
  nextChapter,
  initialProgress,
}: ReaderExperienceProps) {
  const router = useRouter();
  const { t } = useI18n();
  const initialProgressPercent =
    initialProgress.chapter_id === chapter.id ? initialProgress.progress_percent : 0;
  const [preferences, setPreferences] = useState<ReaderPreferences>(DEFAULT_READER_PREFERENCES);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const restoreCompleteRef = useRef(false);
  const userInteractedRef = useRef(false);
  const lastSavedProgressRef = useRef(initialProgressPercent);
  const lastSaveTimeRef = useRef(0);
  const pendingSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setPreferences(parseReaderPreferences(window.localStorage.getItem(READER_PREFERENCES_STORAGE_KEY)));
    setHasLoadedPreferences(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPreferences) {
      return;
    }

    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [hasLoadedPreferences, preferences]);

  useEffect(() => {
    restoreCompleteRef.current = false;
    userInteractedRef.current = false;
    lastSavedProgressRef.current = initialProgressPercent;
    lastSaveTimeRef.current = 0;

    function markUserInteracted() {
      userInteractedRef.current = true;
      restoreCompleteRef.current = true;
    }

    window.addEventListener("wheel", markUserInteracted, { passive: true });
    window.addEventListener("touchstart", markUserInteracted, { passive: true });

    const restoreTimer = window.setTimeout(() => {
      if (userInteractedRef.current) {
        restoreCompleteRef.current = true;
        return;
      }

      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (initialProgressPercent > 0 && scrollableHeight > 200) {
        window.scrollTo({
          top: Math.round((scrollableHeight * initialProgressPercent) / 100),
          behavior: "auto",
        });
      }

      window.setTimeout(() => {
        restoreCompleteRef.current = true;
      }, 400);
    }, 120);

    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("wheel", markUserInteracted);
      window.removeEventListener("touchstart", markUserInteracted);
    };
  }, [chapter.id, initialProgressPercent]);

  useEffect(() => {
    async function saveProgress(force = false) {
      if (!restoreCompleteRef.current && !userInteractedRef.current) {
        return;
      }

      const progressPercent = getScrollPercent();
      if (!force && Math.abs(progressPercent - lastSavedProgressRef.current) < MEANINGFUL_PROGRESS_DELTA) {
        return;
      }

      lastSavedProgressRef.current = progressPercent;
      lastSaveTimeRef.current = Date.now();
      try {
        await updateReadingProgress(book.id, {
          chapter_id: chapter.id,
          progress_percent: progressPercent,
        });
      } catch {
        // Reading should never be interrupted by a background progress save failure.
      }
    }

    function scheduleSave() {
      if (!restoreCompleteRef.current && !userInteractedRef.current) {
        return;
      }

      const elapsed = Date.now() - lastSaveTimeRef.current;
      if (elapsed >= SAVE_INTERVAL_MS) {
        void saveProgress();
        return;
      }

      if (pendingSaveTimerRef.current === null) {
        pendingSaveTimerRef.current = window.setTimeout(() => {
          pendingSaveTimerRef.current = null;
          void saveProgress();
        }, SAVE_INTERVAL_MS - elapsed);
      }
    }

    function saveBeforeLeaving() {
      void saveProgress(true);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        saveBeforeLeaving();
      }
    }

    window.addEventListener("scroll", scheduleSave, { passive: true });
    window.addEventListener("pagehide", saveBeforeLeaving);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("scroll", scheduleSave);
      window.removeEventListener("pagehide", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pendingSaveTimerRef.current !== null) {
        window.clearTimeout(pendingSaveTimerRef.current);
      }
      void saveProgress(true);
    };
  }, [book.id, chapter.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft" && previousChapter) {
        event.preventDefault();
        router.push(`/books/${book.id}/chapters/${previousChapter.id}`);
      }

      if (event.key === "ArrowRight" && nextChapter) {
        event.preventDefault();
        router.push(`/books/${book.id}/chapters/${nextChapter.id}`);
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setPreferences((current) => ({
          ...current,
          mode: getNextReadMode(current.mode),
        }));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [book.id, nextChapter, previousChapter, router]);

  const firstChapter = chapters[0] ?? null;
  const lastChapter = chapters[chapters.length - 1] ?? null;
  const normalizedQuery = chapterQuery.trim().toLowerCase();
  const matchingChapters = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return chapters.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
  }, [chapters, normalizedQuery]);
  const visibleMatches = matchingChapters.slice(0, MAX_SEARCH_RESULTS);
  const hiddenMatchCount = Math.max(0, matchingChapters.length - visibleMatches.length);

  function updatePreference<Key extends keyof ReaderPreferences>(field: Key, value: ReaderPreferences[Key]) {
    setPreferences((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const preferenceStyle = {
    "--reader-font-size": `${preferences.fontSize}px`,
    "--reader-line-height": String(preferences.lineHeight),
    "--reader-content-width": `${preferences.contentWidth}px`,
    "--reader-paragraph-spacing": `${preferences.paragraphSpacing}em`,
  } as CSSProperties;

  return (
    <div
      className={`reader-experience reader-theme-${preferences.theme}`}
      data-reader-theme={preferences.theme}
      style={preferenceStyle}
    >
      <div className="reader-control-strip">
        <button className="button-secondary" type="button" onClick={() => setIsSettingsOpen((current) => !current)}>
          {t("readerSettingsButton")}
        </button>
        <label className="reader-search-control">
          <span>{t("readerChapterSearchTitle")}</span>
          <input
            value={chapterQuery}
            onChange={(event) => setChapterQuery(event.target.value)}
            placeholder={t("readerChapterSearchPlaceholder")}
            type="search"
          />
        </label>
      </div>

      {isSettingsOpen ? (
        <section className="reader-settings-panel" aria-label={t("readerSettingsTitle")}>
          <div>
            <p className="eyebrow">{t("readerSettingsTitle")}</p>
            <p className="muted">{t("readerSettingsDescription")}</p>
          </div>
          <div className="reader-preference-grid">
            <label>
              <span>{t("readerFontSizeLabel")}</span>
              <input
                min={15}
                max={24}
                type="range"
                value={preferences.fontSize}
                onChange={(event) => updatePreference("fontSize", Number(event.target.value))}
              />
            </label>
            <label>
              <span>{t("readerLineHeightLabel")}</span>
              <input
                min={1.6}
                max={2.6}
                step={0.05}
                type="range"
                value={preferences.lineHeight}
                onChange={(event) => updatePreference("lineHeight", Number(event.target.value))}
              />
            </label>
            <label>
              <span>{t("readerContentWidthLabel")}</span>
              <input
                min={620}
                max={1040}
                step={20}
                type="range"
                value={preferences.contentWidth}
                onChange={(event) => updatePreference("contentWidth", Number(event.target.value))}
              />
            </label>
            <label>
              <span>{t("readerParagraphSpacingLabel")}</span>
              <input
                min={0.6}
                max={1.8}
                step={0.1}
                type="range"
                value={preferences.paragraphSpacing}
                onChange={(event) => updatePreference("paragraphSpacing", Number(event.target.value))}
              />
            </label>
            <label>
              <span>{t("readerThemeLabel")}</span>
              <select
                value={preferences.theme}
                onChange={(event) => updatePreference("theme", event.target.value as ReaderPreferences["theme"])}
              >
                <option value="paper">{t("readerThemePaper")}</option>
                <option value="sepia">{t("readerThemeSepia")}</option>
                <option value="dark">{t("readerThemeDark")}</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <section className="reader-search-panel" aria-label={t("readerChapterSearchTitle")}>
        <div className="reader-search-shortcuts">
          {firstChapter ? (
            <Link href={`/books/${book.id}/chapters/${firstChapter.id}`}>{t("readerFirstChapter")}</Link>
          ) : null}
          <Link className="active" href={`/books/${book.id}/chapters/${chapter.id}`}>
            {formatMessage(t("readerCurrentChapterLabel"), { title: chapter.title })}
          </Link>
          {lastChapter ? <Link href={`/books/${book.id}/chapters/${lastChapter.id}`}>{t("readerLastChapter")}</Link> : null}
        </div>
        {visibleMatches.length > 0 ? (
          <div className="reader-search-results">
            {visibleMatches.map((item) => (
              <Link
                key={item.id}
                className={item.id === chapter.id ? "active" : ""}
                href={`/books/${book.id}/chapters/${item.id}`}
              >
                <span>{item.index_in_book}</span>
                <strong>{item.title}</strong>
              </Link>
            ))}
            {hiddenMatchCount > 0 ? (
              <p className="muted">
                {formatMessage(t("readerSearchMoreResults"), { count: hiddenMatchCount })}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <ReadModePanel
        chapter={chapter}
        mode={preferences.mode}
        onModeChange={(mode: ReadMode) => updatePreference("mode", mode)}
      />

      <section className="reader-completion-panel">
        <div>
          <p className="eyebrow">{t("readerCompletionTitle")}</p>
          <p>{t("readerCompletionDescription")}</p>
        </div>
        <div className="reader-completion-actions">
          <Link className="button-link" href={`/books/${book.id}`}>
            {t("backToBook")}
          </Link>
          {nextChapter ? (
            <Link className="button" href={`/books/${book.id}/chapters/${nextChapter.id}`}>
              {t("nextChapter")}
            </Link>
          ) : null}
        </div>
      </section>

      <nav className="reader-mobile-bottom-nav" aria-label={t("navigationHeading")}>
        {previousChapter ? (
          <Link href={`/books/${book.id}/chapters/${previousChapter.id}`}>{t("previousChapter")}</Link>
        ) : (
          <span>{t("readerNoPreviousChapter")}</span>
        )}
        <Link href={`/books/${book.id}`}>{t("backToBook")}</Link>
        {nextChapter ? (
          <Link href={`/books/${book.id}/chapters/${nextChapter.id}`}>{t("nextChapter")}</Link>
        ) : (
          <span>{t("readerNoNextChapter")}</span>
        )}
      </nav>
    </div>
  );
}
