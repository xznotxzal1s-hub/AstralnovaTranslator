"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { TranslateChapterButton } from "@/components/translate-chapter-button";
import { formatMessage } from "@/lib/i18n";
import type { Chapter } from "@/lib/types";

type ChapterCardProps = {
  bookId: number;
  chapter: Chapter;
};

export function ChapterCard({ bookId, chapter }: ChapterCardProps) {
  const { locale, t } = useI18n();

  return (
    <article className="chapter-card">
      <div>
        <p className="eyebrow">{formatMessage(t("chapterEyebrow"), { count: chapter.index_in_book })}</p>
        <h3>{chapter.title}</h3>
      </div>
      <div className="meta-row">
        <span className="pill">{formatMessage(t("statusLabel"), { status: chapter.translation_status })}</span>
        <span>
          {chapter.last_translated_at
            ? formatMessage(t("translatedAt"), { time: new Date(chapter.last_translated_at).toLocaleString(locale) })
            : t("notTranslatedYet")}
        </span>
      </div>
      <div className="action-row">
        <Link className="button" href={`/books/${bookId}/chapters/${chapter.id}`}>
          {t("readChapterButton")}
        </Link>
        <TranslateChapterButton chapterId={chapter.id} compact />
      </div>
    </article>
  );
}
