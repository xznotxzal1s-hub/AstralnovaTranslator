# HANDOFF_STATUS.md

## Project

AstralnovaTranslator

Private, single-user, self-hosted Japanese light novel translator and browser reader.

## Current Snapshot

The app is beyond the original V1 baseline and is currently a usable NAS-friendly private reader:
- Books, chapters, TXT import, EPUB import, and single-page URL import are implemented.
- Translation works through user-configured presets for OpenAI-compatible and Gemini providers.
- Glossary injection, translation cache, and retranslation cache bypass are implemented.
- Batch translation uses simple persisted in-process jobs with visible frontend polling.
- Reader Experience R2A is implemented: reading progress is stored in SQLite, Continue Reading restores the saved chapter and approximate scroll position, and reader visual preferences are stored in browser `localStorage`.
- GHCR image publishing and NAS prebuilt-image deployment files exist.
- Frontend Maintainability R3A is in progress/completed in code: the large global stylesheet has been split into ordered responsibility files, and a few low-risk UI primitives now cover repeated button, form field, pagination, and status badge patterns.
- Frontend Maintainability R3B continued the primitive migration without changing product behavior or visual design.

The project should stay small, private, and beginner-friendly. Do not turn it into a public platform or a distributed job system.

## Most Important Current Behaviors

### Reader
- Default read mode is translation-only.
- Users can switch to source + translation or source-only.
- Continue Reading chooses the saved chapter when present, otherwise the first chapter.
- Saved scroll position is approximate and restored after content renders.
- Progress saves are throttled and should not interrupt reading if a save fails.
- Reader preferences include font size, line height, content width, paragraph spacing, reader theme, and read mode.
- Reader preferences are per browser/device because they live in `localStorage`.
- Keyboard shortcuts:
  - Left arrow: previous chapter
  - Right arrow: next chapter
  - `T`: cycle read mode
- Shortcuts intentionally do not fire while typing in inputs, textareas, selects, contenteditable areas, or with Ctrl/Meta/Alt modifiers.

### Translation
- Active translation preset controls provider, base URL, API key, model, prompt template, chunk size, and translation mode.
- Prompt templates are validated before save.
- Glossary guidance is injected even if the prompt template does not include `{glossary_guidance}`.
- Per-book glossary entries override global glossary entries.
- Normal translation may reuse cached `TranslationRecord` rows.
- Retranslation bypasses the cache and calls the provider again.
- Batch translation jobs stop on first failed chapter.
- Duplicate active batch jobs for the same book are rejected.
- Pending/running jobs left by restart are marked failed/interrupted on next startup.
- Cancellation is cooperative and may wait until the current provider request/chapter finishes.

### Import
- TXT and EPUB import are available from the frontend.
- TXT import keeps heading-based chapter detection and has fallback splitting.
- URL import is preview-confirm: preview first, save only after confirmation.
- URL import has SSRF protections and blocks local/private/link-local/reserved targets.
- URL import is not website crawling.

### Deployment
- Local development still uses FastAPI + Next.js dev server.
- Docker Compose is available for local full-stack runs.
- NAS deployment should use `docker-compose.nas.yml` with GHCR images.
- Frontend browser calls use `/api/backend`, so the normal UI does not depend on hard-coded NAS backend URLs.
- `ALLOWED_ORIGINS` still matters for direct browser access to backend/Swagger.

## Verified Functionality

Previously verified manually during the project:
- backend starts
- frontend starts
- books can be created, renamed, and deleted
- chapters can be created and deleted
- TXT import works
- EPUB import works for simple valid files
- URL import preview and confirm-save flow works
- translation settings/presets can be managed
- single chapter translation works with configured providers
- glossary-aware prompt injection works
- translation cache reuse works
- retranslation bypasses cache
- batch translation works through persisted jobs and frontend polling
- duplicate active batch jobs are blocked
- interrupted jobs are marked failed after backend restart
- backup export returns a zip containing metadata, uploads, and a SQLite snapshot
- chapter list pagination, status filtering, and title search work
- bookshelf client refresh uses browser-side API fetching after page load and after create/import/delete
- NAS deployment with prebuilt images and same-origin frontend proxy has worked after the CORS/proxy fixes

Most recent Codex-side verification:

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest tests.test_reading_progress tests.test_schema_migrations tests.test_route_registration
```

Result: `12 tests OK`

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test*.py"
```

Result: `55 tests OK`

```powershell
cd frontend
npm exec tsc -- --noEmit --incremental false
```

Result: passed with exit code `0`

## Codex Verification Constraints

The Windows Codex app can hang on long frontend production builds or Docker builds.

Do not run these inside Codex unless the user explicitly allows it:
- `npm run build`
- `npm ci` followed by build
- `docker compose build`
- `docker compose up`
- long Docker smoke tests

Preferred Codex-side checks:
- backend unittest
- targeted backend unittest
- lightweight TypeScript no-emit check
- static inspection of frontend API paths

GitHub Actions is the source of truth for frontend production build verification.

## Known Issues and Risks

- API keys are stored in SQLite for V1 simplicity. They are masked/redacted in API responses but not encrypted at rest.
- Backup zip files include a SQLite snapshot and may contain saved API keys.
- URL import is practical but simple; pages behind login, heavy client rendering, or anti-bot protection may fail.
- URL import intentionally blocks local/private targets for NAS safety.
- Batch jobs are in-process and not resumable.
- Reader scroll restoration is approximate, especially after translated text changes.
- The global frontend stylesheet is large and should be split later.
- Settings and glossary pages are usable but still have room for form/table polish.
- Translation presets are global only; no per-book preset binding yet.

## Current File Areas to Know

Backend:
- `backend/app/api/` - FastAPI routers
- `backend/app/models/` - SQLAlchemy models
- `backend/app/services/` - translation, import, backup, jobs, reading progress logic
- `backend/app/core/migrations.py` - lightweight SQLite schema migrations
- `backend/tests/` - unittest suite

Frontend:
- `frontend/app/` - Next.js pages and API proxy
- `frontend/app/globals.css` - ordered stylesheet entrypoint only
- `frontend/app/styles/` - split global CSS files, imported in cascade order
- `frontend/components/` - UI components
- `frontend/components/ui/` - small local UI primitives
- `frontend/lib/api.ts` - server-side backend fetch helper
- `frontend/lib/api-client.ts` - browser-side same-origin API helper
- `frontend/lib/i18n.ts` - visible UI strings

Deployment:
- `docker-compose.yml` - local build-oriented Compose
- `docker-compose.nas.yml` - NAS prebuilt GHCR image Compose
- `.github/workflows/publish-images.yml` - GHCR publishing workflow

## Recommended Next Phase

Best next phase: UI/code maintainability cleanup, not new product scope.

### Frontend Maintainability R3A notes

CSS split files:
- `frontend/app/styles/base.css`
- `frontend/app/styles/layout.css`
- `frontend/app/styles/cards.css`
- `frontend/app/styles/forms.css`
- `frontend/app/styles/feedback.css`
- `frontend/app/styles/reader.css`
- `frontend/app/styles/bookshelf.css`
- `frontend/app/styles/book-detail.css`
- `frontend/app/styles/visual-polish.css`
- `frontend/app/styles/dark-theme.css`
- `frontend/app/styles/reader-polish.css`
- `frontend/app/styles/settings.css`
- `frontend/app/styles/glossary.css`
- `frontend/app/styles/dialogs.css`
- `frontend/app/styles/responsive.css`

UI primitives added:
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/form-field.tsx`
- `frontend/components/ui/pagination.tsx`
- `frontend/components/ui/status-badge.tsx`

R3A migrated only low-risk surfaces:
- chapter status badges
- reader header status badge
- book detail filter fields
- book detail pagination controls

R3A verification:
- `npm exec tsc -- --noEmit --incremental false` passed in `frontend/`
- no backend tests were required because backend files were not touched
- local `npm run build` was intentionally skipped because GitHub Actions is the production build source of truth
- Docker build/up/smoke was intentionally skipped due to Codex constraints

R3B candidates:
- continue migrating any newly added direct button/link markup to `Button` / `ButtonLink`
- continue migrating any newly added simple forms to `FormField`
- split or simplify `visual-polish.css` and `reader-polish.css` after visual browser checks
- consider component-level CSS only after the current split has proven stable

### Frontend Maintainability R3B notes

R3B migrated more repeated markup to existing primitives:
- create book form
- create chapter form
- TXT/EPUB import form
- URL import preview form
- book title editor
- delete book/chapter buttons
- batch translate button
- translate chapter button
- confirm dialog actions
- glossary manager form/actions
- settings preset form/actions
- book card action link
- reader/book/glossary page button-like links

R3B verification:
- `npm exec tsc -- --noEmit --incremental false` passed in `frontend/`
- no backend tests were required because backend files were not touched
- local `npm run build` was intentionally skipped because GitHub Actions is the production build source of truth
- Docker build/up/smoke was intentionally skipped due to Codex constraints

### Reader R2A manual checklist

Before or during any UI refactor, manually spot-check the reader flow in a browser:
- Continue Reading opens the saved chapter.
- Approximate scroll restoration happens after content renders.
- Initial restore does not immediately overwrite saved progress with `0%`.
- Reader preferences persist in `localStorage`.
- Read mode cycles through translation-only, bilingual, and source-only.
- Keyboard shortcuts do not trigger while typing in inputs, textareas, selects, or contenteditable areas.
- Mobile bottom reader navigation is present.
- Chapter search/jump remains lightweight and caps visible matches.

Suggested order:
1. Manually verify Reader Experience R2A on desktop and mobile with a long book.
2. Split `frontend/app/globals.css` into smaller style files or clearly separated sections.
3. Extract repeated frontend primitives: buttons, panels, form rows, feedback messages, pagination controls.
4. Improve settings and glossary density/usability without changing backend architecture.
5. Add provider connection testing and optional model-list helpers.
6. Consider backup restore/import only later, because restore is riskier than export.

## Explicit Non-Goals Still Unchanged

Do not add unless explicitly requested:
- login or multi-user support
- public sharing/distribution
- bulk website crawling
- browser extension
- OCR
- PDF import
- TTS
- cloud sync
- social features
- Redis/Celery or a complex distributed job queue

## Notes for Future Agents

- Read `PROJECT_SPEC.md` first, then `AGENTS.md`.
- Keep changes incremental and focused.
- Keep provider, deployment, and UI changes separated unless the user explicitly asks for a combined pass.
- Do not silently expand the product scope.
- Update this file after meaningful implementation work.
- Update `README.md` when user-facing behavior, setup, deployment, or operational behavior changes.
