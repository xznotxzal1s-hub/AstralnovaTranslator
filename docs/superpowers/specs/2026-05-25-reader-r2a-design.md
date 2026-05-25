# Reader Experience Optimization R2A Design

## Goal

Improve AstralnovaTranslator's reading comfort without changing translation logic, provider setup, Docker deployment, or unrelated backend architecture.

R2A focuses on making the reader practical for long private reading sessions across desktop and mobile:
- continue reading from the last saved chapter
- save cross-device reading progress in SQLite
- persist visual reader preferences locally in the browser
- improve chapter movement for large books
- keep the implementation simple, single-user, and NAS-friendly

## Non-Goals

This slice will not implement:
- provider templates
- test API connection
- model list fetching
- provider request options
- export features
- login, multi-user support, cloud sync, PDF/OCR/TTS, browser extension, or a major rewrite
- local frontend production build or Docker smoke verification inside Codex

## Backend Design

Add a `ReadingProgress` model/table:
- `id`
- `book_id`
- `chapter_id`
- `progress_percent`
- `updated_at`

`book_id` should be unique so each book has one current reading progress row. `chapter_id` should be nullable or otherwise safe when chapters are deleted. `progress_percent` stores an integer from `0` to `100`. This is enough for a first pass and avoids over-modeling pixel offsets.

Add API endpoints:
- `GET /books/{book_id}/reading-progress`
- `PUT /books/{book_id}/reading-progress`

Read behavior:
- If the book does not exist, return `404`.
- If no progress exists, return a response with `chapter_id = null`, `progress_percent = 0`, `updated_at = null`, and `fallback_used = false`.
- If saved progress points to a deleted chapter, return the first available chapter for that book if one exists; otherwise return `chapter_id = null`.
- Include `fallback_used = true` when a deleted or invalid saved chapter was replaced by a fallback chapter.
- Deleting a book should delete its reading progress.
- Deleting a chapter should not break reading progress lookup.

Write behavior:
- Validate that the book exists.
- Validate that the target chapter exists and belongs to the book.
- Clamp or validate progress percent between `0` and `100`.
- Upsert the single progress row for that book.

Response schemas:
- `ReadingProgressResponse`: `book_id`, nullable `chapter_id`, `progress_percent`, nullable `updated_at`, `fallback_used`
- `ReadingProgressUpdate`: `chapter_id`, `progress_percent`

Schema maintenance:
- Use the existing lightweight migration runner.
- Add a migration for `reading_progress`.
- Keep old SQLite databases working.

## Frontend Design

### Continue Reading

Add server-side fetching for reading progress on the book detail page:
- book detail page: show a prominent `Continue reading` action near book actions
- bookshelf book cards keep their current primary link to the book detail page in R2A to avoid adding one progress request per book; a bookshelf-level continue shortcut can be a later optimization if needed

Continue behavior:
- If progress has a valid chapter, open that chapter.
- If progress has a valid percentage, restore approximate scroll position after the chapter content renders.
- If no progress exists but the book has chapters, open the first chapter.
- If the book has no chapters, keep the user on the book detail page and show existing empty-state guidance.

### Progress Saving

On the reader page, a small client component will:
- watch scroll position after page load
- restore saved scroll position before enabling automatic saves
- avoid immediately overwriting saved progress with `0%` during initial load
- compute progress percentage from current scroll position
- send `PUT /books/{book_id}/reading-progress` with debounce/throttle
- save at most once every few seconds during scrolling
- only save when progress changes meaningfully, such as at least `1-2%`
- save once on page visibility change when the browser supports it

The component should avoid noisy state updates and should not block reading if the save request fails.

### Reader Preferences

Add a compact reader settings panel in the reader page. Preferences are visual-only and stored in `localStorage`:
- font size
- line height
- content width
- paragraph spacing
- reader theme: paper, sepia, dark
- default read mode: translation-only, bilingual, source-only

These preferences should persist across chapters and devices independently. They are intentionally not stored in SQLite in R2A because they are local display choices rather than library data.

Implementation should use CSS custom properties on the reader surface, not a large rewrite of global styles.

### Read Modes

Extend the current read mode panel from:
- translation-only
- source-and-translation

to:
- translation-only
- bilingual
- source-only

Default mode should come from localStorage. If no preference exists, keep the current translation-only default.

Compatibility:
- map old localStorage value `source-and-translation` to `bilingual`
- reset safely to defaults if localStorage has invalid JSON or an invalid mode

### Reader Navigation

Keep existing previous/next chapter buttons and add:
- left arrow: previous chapter
- right arrow: next chapter
- `T`: cycle read mode
- mobile sticky bottom bar: previous / book / next

Keyboard shortcuts must not trigger while the user is typing in `input`, `textarea`, `select`, `contenteditable`, or when Ctrl/Meta/Alt modifiers are pressed.

Add a compact chapter jump/search panel:
- search chapter title
- show current chapter
- quick jump to first and last chapter
- render a lightweight list of matching chapter links rather than heavy cards
- cap visible search results, for example to `50`
- show a small hint when more matches exist

The existing focused sidebar window can remain; the search panel is an additive improvement for large books.

### Reader Layout

Improve the existing reading surface without a full redesign:
- make translated text the visual focus
- keep source text secondary in bilingual mode
- preserve source and translation line breaks
- keep paragraph spacing comfortable
- avoid large empty panels
- add a subtle bottom area after the chapter text with next-chapter and back-to-book actions

## Error Handling

Backend:
- return `404` for missing books/chapters
- reject chapter progress updates when the chapter does not belong to the book
- use clear response schemas so the frontend does not need to infer missing progress

Frontend:
- progress save failures should not interrupt reading
- continue-reading should gracefully fall back to first chapter or book detail page
- localStorage parsing should tolerate invalid stored values and reset to defaults

## Testing Plan

Backend unittest:
- create reading progress
- update reading progress
- read missing progress
- reject progress for another book's chapter
- deleted chapter fallback returns first available chapter
- migration creates the `reading_progress` table on existing databases
- no chapters returns `chapter_id = null`
- route registration covers reading progress endpoints

Frontend verification in Codex:
- do not run `npm run build`
- do not run Docker build/up/smoke tests
- use lightweight TypeScript inspection if needed
- rely on GitHub Actions for production frontend build verification

Manual UI verification:
- create or import a book with multiple chapters
- open a later chapter and scroll partway down
- refresh and confirm progress remains
- open the book detail page and click continue reading
- verify reader settings persist across chapter navigation
- verify keyboard shortcuts on desktop
- verify mobile sticky previous/book/next controls

## Acceptance Criteria

R2A is acceptable when:
- a book can store and retrieve last-read chapter progress from SQLite
- `Continue reading` opens the saved chapter or falls back safely
- reader visual preferences persist in localStorage
- read mode can switch between translation-only, bilingual, and source-only
- previous/next keyboard shortcuts work on the reader page
- mobile reader has clear previous/book/next controls
- backend tests pass
- README and HANDOFF_STATUS describe the new reader behavior and Codex verification constraints
