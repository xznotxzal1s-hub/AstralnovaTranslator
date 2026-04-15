import Link from "next/link";

import { TranslateChapterButton } from "@/components/translate-chapter-button";
import type { Chapter } from "@/lib/types";

type ChapterCardProps = {
  bookId: number;
  chapter: Chapter;
};

export function ChapterCard({ bookId, chapter }: ChapterCardProps) {
  return (
    <article className="chapter-card">
      <div>
        <p className="eyebrow">Chapter {chapter.index_in_book}</p>
        <h3>{chapter.title}</h3>
      </div>
      <div className="meta-row">
        <span className="pill">Status: {chapter.translation_status}</span>
        <span>
          {chapter.last_translated_at
            ? `Translated ${new Date(chapter.last_translated_at).toLocaleString()}`
            : "Not translated yet"}
        </span>
      </div>
      <div className="action-row">
        <Link className="button" href={`/books/${bookId}/chapters/${chapter.id}`}>
          Read chapter
        </Link>
        <TranslateChapterButton chapterId={chapter.id} compact />
      </div>
    </article>
  );
}
