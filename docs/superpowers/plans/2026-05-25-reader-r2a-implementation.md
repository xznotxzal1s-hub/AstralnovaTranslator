# Reader Experience Optimization R2A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SQLite-backed reading progress plus local reader preferences, safer navigation, and long-book reader lookup without touching provider logic or deployment.

**Architecture:** Backend stores one `ReadingProgress` row per book and exposes a small REST API. Frontend keeps visual preferences in `localStorage`, restores scroll after chapter render, throttles progress saves, and adds reader-only navigation controls.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite migrations, unittest, Next.js App Router, React client components, TypeScript, CSS custom properties.

---

## File Structure

Backend:
- Create `backend/app/models/reading_progress.py` for the SQLAlchemy model.
- Create `backend/app/schemas/reading_progress.py` for `ReadingProgressResponse` and `ReadingProgressUpdate`.
- Create `backend/app/services/reading_progress_service.py` for lookup, fallback, validation, and upsert behavior.
- Create `backend/app/api/reading_progress.py` for `GET` and `PUT` endpoints.
- Modify `backend/app/models/__init__.py` to import the model.
- Modify `backend/app/main.py` to register the router.
- Modify `backend/app/core/migrations.py` to add migration `006_reading_progress`.
- Add `backend/tests/test_reading_progress.py`.
- Modify `backend/tests/test_schema_migrations.py` and `backend/tests/test_route_registration.py`.

Frontend:
- Modify `frontend/lib/types.ts` to add `ReadingProgress`.
- Modify `frontend/lib/api.ts` and `frontend/lib/api-client.ts` to fetch and update progress through `/api/backend`.
- Create `frontend/components/reader-preferences.ts` for constants, parsing, defaults, and compatibility mapping.
- Create `frontend/components/reader-experience.tsx` as the reader client controller for preferences, read modes, scroll restore/save, keyboard shortcuts, mobile nav, and chapter search.
- Modify `frontend/components/read-mode-panel.tsx` to accept controlled mode and support `translation-only`, `bilingual`, and `source-only`.
- Modify `frontend/app/books/[bookId]/page.tsx` to show `Continue reading`.
- Modify `frontend/app/books/[bookId]/chapters/[chapterId]/page.tsx` to pass progress, chapters, and navigation props into the client reader experience.
- Modify `frontend/app/globals.css` for reader preference variables, settings panel, search panel, source-secondary styling, and mobile sticky reader nav.
- Modify `frontend/lib/i18n.ts` for labels.

Docs:
- Update `README.md` and `HANDOFF_STATUS.md`.

---

## Task 1: Backend Reading Progress API

**Files:**
- Create: `backend/tests/test_reading_progress.py`
- Create: `backend/app/models/reading_progress.py`
- Create: `backend/app/schemas/reading_progress.py`
- Create: `backend/app/services/reading_progress_service.py`
- Create: `backend/app/api/reading_progress.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/core/migrations.py`
- Modify: `backend/tests/test_schema_migrations.py`
- Modify: `backend/tests/test_route_registration.py`

- [ ] **Step 1: Write failing backend tests**

Add unittest cases covering missing progress, create, update, wrong-book chapter rejection, deleted-chapter fallback, no-chapter fallback, migration table creation, and route registration.

- [ ] **Step 2: Run targeted tests and verify RED**

Run from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_reading_progress tests.test_schema_migrations tests.test_route_registration
```

Expected: fail because `reading_progress` modules/routes do not exist yet.

- [ ] **Step 3: Implement model/schema/service/API/migration**

Model requirements:
- `book_id` unique and cascades on book delete.
- `chapter_id` nullable and uses `ON DELETE SET NULL`.
- `progress_percent` integer.
- `updated_at` updates on write.

Service requirements:
- missing progress returns `chapter_id=None`, `progress_percent=0`, `updated_at=None`, `fallback_used=False`.
- deleted or invalid chapter falls back to first chapter in `index_in_book`, `created_at`, `id` order.
- update rejects a chapter that does not belong to the book.

- [ ] **Step 4: Run targeted backend tests and verify GREEN**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_reading_progress tests.test_schema_migrations tests.test_route_registration
```

Expected: all targeted tests pass.

---

## Task 2: Continue Reading Link

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/app/books/[bookId]/page.tsx`
- Modify: `frontend/lib/i18n.ts`

- [ ] **Step 1: Add progress type and server fetch helper**

Add `ReadingProgress` with `book_id`, nullable `chapter_id`, `progress_percent`, nullable `updated_at`, and `fallback_used`.

Add `fetchReadingProgress(bookId)` in `frontend/lib/api.ts`.

- [ ] **Step 2: Add Continue Reading on book detail page**

Fetch reading progress with book and chapters. Link target:
- saved `chapter_id` if present
- first chapter if no progress
- no link if there are no chapters

Use localized copy for `Continue reading`, `Start reading`, and progress percentage.

- [ ] **Step 3: Inspect for TypeScript consistency**

Do not run `npm run build`. Inspect imports/types and use the lightweight TypeScript no-emit check during final verification.

---

## Task 3: Reader Preferences and Scroll Progress Client

**Files:**
- Create: `frontend/components/reader-preferences.ts`
- Create: `frontend/components/reader-experience.tsx`
- Modify: `frontend/components/read-mode-panel.tsx`
- Modify: `frontend/lib/api-client.ts`
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/app/books/[bookId]/chapters/[chapterId]/page.tsx`
- Modify: `frontend/lib/i18n.ts`
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Add client API helpers**

Add `fetchReadingProgressClient(bookId)` and `updateReadingProgress(bookId, payload)` to `frontend/lib/api-client.ts`.

- [ ] **Step 2: Add preference parsing utilities**

Create defaults and safe parser:
- map `source-and-translation` to `bilingual`
- reset invalid JSON or invalid values
- supported modes: `translation-only`, `bilingual`, `source-only`

- [ ] **Step 3: Convert read mode panel to controlled component**

`ReadModePanel` receives `mode`, `onModeChange`, and renders translation-only, bilingual, or source-only while preserving line breaks.

- [ ] **Step 4: Add `ReaderExperience` client component**

Responsibilities:
- apply CSS variables for font size, line height, content width, paragraph spacing, theme
- restore scroll after mount using initial `progress_percent`
- wait until restore completes before saving
- throttle saves to at most once every few seconds
- only save when progress changed by at least `2%`
- save on `visibilitychange` and `pagehide`
- ignore progress save failures
- keyboard shortcuts skip inputs, textareas, selects, contenteditable, and Ctrl/Meta/Alt modified events
- provide compact chapter search capped at 50 visible results with an overflow hint
- provide mobile sticky previous/book/next nav

- [ ] **Step 5: Wire reader page**

Fetch reading progress server-side and pass initial progress to `ReaderExperience`. Keep existing sidebar and previous/next links.

- [ ] **Step 6: Add CSS and i18n labels**

Add calm reader settings/search/nav styling and localized labels in English, Simplified Chinese, and Japanese.

---

## Task 4: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `HANDOFF_STATUS.md`

- [ ] **Step 1: Update docs**

Document:
- progress stored in SQLite and works across devices
- Continue Reading restores chapter and approximate scroll percentage
- reader visual preferences stored in browser `localStorage`
- preferences are per browser/device
- keyboard shortcuts
- mobile sticky reader controls
- Codex must not run local frontend production build or Docker smoke unless explicitly allowed

- [ ] **Step 2: Run backend full unittest**

Run from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test*.py"
```

Expected: all tests pass.

- [ ] **Step 3: Run targeted backend tests**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_reading_progress tests.test_schema_migrations tests.test_route_registration
```

Expected: all tests pass.

- [ ] **Step 4: Lightweight frontend inspection**

Do not run `npm run build`. Do not run Docker. Inspect that:
- browser client calls use `/api/backend`
- no hard-coded NAS URL appears in browser code
- TypeScript imports line up

If a lightweight TypeScript check is used, prefer:

```powershell
npm exec tsc -- --noEmit --incremental false
```

---

## Self-Review

Spec coverage:
- Backend progress model/API/migration: Task 1.
- Deleted chapter fallback and no-chapter response: Task 1.
- Scroll restoration and safe throttled saving: Task 3.
- Keyboard shortcut safety: Task 3.
- LocalStorage compatibility and invalid value recovery: Task 3.
- Chapter jump/search cap: Task 3.
- Continue Reading: Task 2.
- Documentation and verification constraints: Task 4.

No placeholders remain. Provider work, export work, Docker workflow changes, local production build, and Docker smoke tests stay out of scope.
