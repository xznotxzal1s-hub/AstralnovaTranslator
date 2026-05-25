# HANDOFF_STATUS.md

## Project
AstralnovaTranslator

## Current status
The project is functionally through the latest URL import feature pass and is now in incremental UI refinement. The current frontend focus is making the reading and bookshelf experience feel calmer, denser where useful, and more comfortable on desktop and mobile without changing backend behavior, translation behavior, or deployment behavior.

The app currently supports:
- creating books
- creating chapters by pasting Japanese text
- importing TXT files
- importing EPUB files
- previewing and importing webpage URLs into books/chapters
- configuring multiple translation presets and switching the active preset
- translating single chapters
- reusing cached translations
- using global and per-book glossary entries
- reading chapters in a reading-focused UI
- using clear previous/next navigation on the reader page
- paginating chapter lists on the book detail page
- filtering and searching chapters on the book detail page
- deleting books and chapters
- batch translating all untranslated chapters in a book
- exporting a local backup zip from the settings page
- publishing backend/frontend Docker images to GHCR via GitHub Actions
- NAS deployment with prebuilt images through a separate Compose file
- UI-R1 bookshelf modernization with a cleaner import workspace and cover-style book cards
- mobile bookshelf refinement with fixed bottom navigation and compact book rows

## Completed phases

### Phase 1
Completed and verified locally:
- FastAPI backend scaffold
- SQLite integration
- `Book` and `Chapter` models
- basic CRUD APIs
- Docker/basic project structure
- frontend skeleton

### Phase 2
Completed and verified locally:
- translation settings persistence
- `GET /settings`
- `PUT /settings`
- provider abstraction
- OpenAI-compatible provider
- Gemini provider
- `POST /chapters/{id}/translate`
- translated text saved back to database

### Phase 3
Completed and manually verified locally:
- bookshelf page
- book detail page
- chapter reading page
- create book from UI
- create chapter from UI
- trigger translation from UI
- read source and translated text from UI

### Phase 4
Completed and verified locally:
- TXT import backend + UI flow
- EPUB import backend + UI flow
- manual chapter creation remains supported
- imported content persists after refresh/restart

### Webpage URL import
Completed in code:
- backend URL import endpoint
- backend URL import preview endpoint
- webpage readable-text extraction for typical article / novel pages
- frontend URL import entry on the bookshelf page
- frontend URL import now previews detected title, chapter count, and extracted text before saving
- imported webpage content reuses existing chapter creation and fallback splitting flow

### Phase 5A
Completed and verified locally:
- usable settings page connected to backend settings API
- usable glossary page with CRUD
- better loading/success/error feedback in forms and translation actions

### Translation preset refinement
Completed and verified locally:
- multiple saved translation presets
- create / edit / delete / activate preset workflow
- active preset used by translation requests
- old `/settings` capability preserved as the active preset view

### Phase 5B1
Completed and verified locally:
- basic UI internationalization support
- Simplified Chinese default UI
- language switching for Simplified Chinese / English / Japanese
- global glossary and per-book glossary data model/API/UI path

### Phase 5B2
Completed and verified locally:
- glossary entries included in translation prompt assembly
- per-book glossary overrides global glossary on matching terms
- `TranslationRecord` cache support
- repeated identical translation requests reuse cached results

### Phase 5C
Completed and verified locally:
- major frontend readability/usability refresh
- improved reading page layout and typography
- calmer bookshelf/book detail layout
- better mobile usability

### Phase 6A
Completed and verified locally:
- delete book action with confirmation
- delete chapter action with confirmation
- batch translate all untranslated chapters from book detail page
- visible batch translation progress and stop-on-error behavior
- TXT fallback splitting when heading detection fails

### Post-Phase 6A UI refinement
Completed and verified locally:
- chapter list pagination on the book detail page
- tighter, easier-to-scan chapter cards
- translation-only as the default reader mode
- stronger hover / active / focus / loading feedback on controls
- calmer visual density for cards, inputs, and action areas

### Deployment automation
Implemented:
- GitHub Actions workflow for backend image publishing to GHCR
- GitHub Actions workflow for frontend image publishing to GHCR
- backend image publishing now waits for the backend unittest suite to pass
- frontend image publishing now waits for a GitHub Actions `npm run build` check to pass
- Next.js production builds no longer ignore TypeScript or ESLint build-time errors
- `scripts/smoke-docker.ps1` is available for manual local Docker Compose smoke testing
- separate NAS Compose file using image tags instead of local build contexts
- frontend browser API calls now default to the same-origin `/api/backend` proxy, so random NAS tunnel / Tailscale frontend URLs do not require new CORS origins
- frontend browser API calls are now hard-coded to `/api/backend` to prevent stale GitHub repository variables from baking old absolute backend URLs into GHCR images

### Prompt template validation refinement
Completed in code and covered by backend regression tests:
- added backend prompt template validation for allowed placeholders
- added `POST /settings/validate-prompt`
- settings and preset saves now reject malformed templates and unknown placeholders before translation time
- templates without `{glossary_guidance}` remain valid because glossary guidance is still appended automatically
- the settings page validates prompt templates before saving or creating presets

### Japanese-aware chunk splitting refinement
Completed in code and covered by backend regression tests:
- `split_text_into_chunks()` now prefers paragraph boundaries before sentence-level splitting
- long Japanese prose can split at `。！？!?`, closing dialogue marks, and ellipses such as `……`
- very long sentences still fall back to hard length splitting
- empty chunks are filtered out

### Translation job backend foundation
Completed in code and covered by backend regression tests:
- added persisted `TranslationJob` storage for simple batch translation progress
- added startup schema migration for the `translation_jobs` table
- added `POST /books/{book_id}/translation-jobs`
- added `GET /translation-jobs/{job_id}`
- added `POST /translation-jobs/{job_id}/cancel`
- jobs process untranslated chapters sequentially through the existing translation service without Redis/Celery

### Batch translation polling refinement
Completed in code:
- the book detail page now creates a persisted translation job for batch translation
- the frontend polls `GET /translation-jobs/{job_id}` for progress instead of translating each chapter directly in the browser
- batch progress, success, cancellation, and failure messages are shown through the existing feedback area

### Webpage import preview refinement
Completed in code and covered by backend regression tests:
- added `POST /import/url/preview`
- the URL import UI now extracts a preview before creating a book
- users can review detected title, chapter count, and the first extracted text before confirming import
- the final confirm action still uses the existing URL import save path

### Backup export refinement
Completed in code and covered by backend regression tests:
- added `GET /backup/export`
- backup export creates a zip with `data/app.db`, uploaded files, and `metadata.json`
- settings page now includes a simple download backup button
- documentation warns that exported SQLite backups may contain saved API keys

### Chapter list filtering refinement
Completed in code:
- book detail page chapter lists can be filtered by translation status
- chapter title search is available on the book detail page
- pagination links preserve the active search/status filters
- empty filtered results show a localized friendly message

### Reader navigation refinement
Completed in code:
- reader page now shows explicit previous/current/next navigation above and below the reading surface
- desktop reader includes a small floating previous/next control that avoids rendering huge chapter lists
- mobile keeps navigation inline so it does not cover long-form text
- existing focused chapter outline remains available in the reader sidebar

### Reader sidebar theme/density refinement
Completed in code:
- reader chapter outline now follows the active day/night theme instead of staying dark in day mode
- reader sidebar card is constrained to the viewport on desktop and scrolls internally
- chapter outline rows are denser with two-line title clamping, so large books show more usable navigation at once
- mobile keeps the outline unconstrained so it remains natural in the page flow

### UI-R1 bookshelf refinement
Implemented in the first slice:
- modernized bookshelf layout while preserving the existing client-side book refresh flow
- consolidated manual create, URL import, TXT import, and EPUB import into one import workspace dialog
- replaced plain book list cards with more readable cover-style bookshelf cards
- added a graceful homepage fallback so a temporary backend fetch failure shows a bookshelf refresh error instead of a Next.js runtime crash
- added Lucide icons plus small utility helpers for class composition
- kept real backend data as the source of truth; no mock bookshelf data was introduced

### UI-R2 reading polish refinement
Implemented in code:
- shifted the visual system toward a warmer paper-and-ink reading app style
- reduced the bookshelf page's dark admin-dashboard feeling and improved book-card readability
- widened and softened the reader surface for more comfortable long-form Chinese reading
- improved reader typography, line height, and page-like depth
- gave the reader chapter outline a clearer side-panel treatment on desktop
- made settings and glossary pages visually closer to the rest of the app with clearer card hierarchy
- kept this pass CSS-focused and incremental, without changing backend behavior or translation logic

### Taste-skill homepage refinement
Implemented in code:
- rebuilt the homepage/bookshelf first screen as an asymmetric reading-desk layout
- added a clearer local-library metric block and recent-book strip without adding backend scope
- replaced homepage Lucide icon usage with small inline SVG primitives and CSS markers
- removed the now-unused `lucide-react` frontend dependency from package manifests
- kept the homepage mobile layout single-column and avoided production build verification inside Codex

### UI-R3 non-homepage refinement
Implemented in code:
- replaced browser-native destructive confirmations with a reusable in-app confirmation dialog
- added a small reusable feedback message component for consistent success/error presentation
- improved book-detail chapter pagination with direct page-number links in addition to previous/next
- reduced reader sidebar load for long books by showing a focused chapter window around the current chapter plus first/last shortcuts
- refined settings preset cards, settings form grouping, glossary empty state, and glossary entry density
- kept the pass frontend-only and did not change backend translation or deployment behavior

### Mobile bookshelf usability refinement
Implemented in code:
- moved the mobile app navigation into a fixed bottom bar so the top of the page is no longer consumed by the header
- made the mobile bookshelf use compact horizontal book rows instead of large cover cards
- tightened the mobile bookshelf hero and import workspace so more library content is visible immediately
- preserved the desktop bookshelf layout and did not change backend, translation, or deployment behavior

### Translation correctness refinement
Completed in code and covered by backend regression tests:
- `/chapters/{id}/translate` still reuses matching `TranslationRecord` cache entries
- `/chapters/{id}/retranslate` now bypasses matching cache entries and calls the configured provider again
- newly saved translation records still include provider type, model name, prompt hash, and source hash
- glossary guidance is appended when a custom prompt template omits `{glossary_guidance}`
- the default initial prompt template now includes the glossary guidance placeholder

### NAS security hardening refinement
Completed in code and covered by backend regression tests:
- CORS origins now come from `ALLOWED_ORIGINS` instead of a wildcard
- TXT/EPUB uploads are streamed with a configurable `MAX_UPLOAD_MB` limit
- webpage imports reject non-HTTP(S), localhost, private, link-local, reserved, and redirected unsafe targets
- webpage imports enforce a configurable `MAX_WEBPAGE_MB` response limit and require HTML content
- settings read responses mask API keys and expose `has_api_key`
- settings updates preserve the existing API key when the submitted key is empty or the masked placeholder

### Provider error safety refinement
Completed in code and covered by backend regression tests:
- OpenAI-compatible and Gemini provider HTTP errors are converted into user-safe provider errors
- provider error messages redact configured API keys before they reach the translation endpoint response
- Gemini request URL errors redact `key=...` query parameters before being surfaced
- translation service keeps its existing failed-status behavior while sanitizing unexpected provider exceptions

### Lightweight SQLite migration refinement
Completed in code and covered by backend regression tests:
- startup schema maintenance now runs through a small versioned migration runner
- applied schema migrations are tracked in a `schema_migrations` table
- legacy SQLite databases can still receive the existing chapter index, translation cache, glossary scope, and preset-field upgrades
- migrations are idempotent, so repeated app starts do not rerun already-recorded migrations
- `ensure_schema()` remains as the simple startup entry point but no longer owns all schema upgrade SQL directly

### Data consistency refinement
Completed in code and covered by backend regression tests:
- `TranslationRecord` cache keys are now unique and repeated saves update the existing cache row
- chapters now have a uniqueness guarantee for `(book_id, index_in_book)`
- existing SQLite databases are normalized and given unique indexes during startup schema checks
- chapter create/update/delete, chapter translation, and per-book glossary changes now touch the parent book `updated_at`
- TypeScript incremental build cache is ignored and removed from Git tracking

## Verified functionality

Verified working locally at this point:
- backend starts
- frontend starts
- books can be created from UI
- chapters can be created manually from UI
- TXT import works
- EPUB import works for simple valid files
- webpage URL import preview and confirm-save flow is implemented and covered by backend tests
- translation presets can be created, edited, deleted, and switched
- invalid prompt templates are rejected before translation settings are saved
- glossary entries can be created, edited, and deleted
- per-book glossary entries stay scoped to the correct book
- chapter translation works with configured providers
- glossary-aware translation prompt logic works
- Japanese-aware chunk splitting is covered by backend tests
- translation cache prevents repeated identical provider calls
- retranslation bypasses cached translations instead of returning the old cached text
- backend regression tests cover the new NAS hardening behavior
- backend regression tests cover provider error redaction so API keys are not exposed in translation failures
- backend regression tests cover the lightweight schema migration runner and legacy SQLite schema upgrades
- backend regression tests cover translation cache de-duplication, chapter index uniqueness, and parent book timestamp updates
- translated content persists after restart
- books can be deleted
- chapters can be deleted
- batch translation works sequentially from the book detail page through persisted backend jobs and frontend polling
- backup export creates a local zip containing the SQLite database, uploads, and metadata
- chapter pagination works on the book detail page
- chapter status filtering and title search work on the book detail page
- reader opens in translation-only mode by default and can still switch to bilingual mode
- reader previous/next navigation is visible near both the top and bottom of the reading surface
- reader chapter outline follows day/night mode correctly and shows more entries per screen
- bookshelf refresh still uses the browser-side API fetch after page load and after create/import/delete actions

## Current UI / UX status

Current UI state:
- the app is now reading-focused rather than a rough admin-style interface
- UI-R1 started with the bookshelf page: the library area now feels more like a real shelf, and create/import actions are grouped into one cleaner dialog
- UI-R2 applies a warmer, more consistent paper-and-ink visual language across the app shell, bookshelf, reader, settings, and glossary surfaces
- the Taste-skill homepage pass makes the first screen feel more like a reading desk than a utility dashboard
- UI-R3 improves non-homepage management pages and replaces rough browser confirmations with in-app dialogs
- the mobile app shell now uses a fixed bottom navigation bar and denser bookshelf rows for better one-handed browsing
- the chapter reading page has the strongest polish and is the best current experience
- the reader page now has clearer large-book navigation without rendering every chapter link
- the reader sidebar no longer uses a permanently dark card in day mode
- bookshelf and book detail pages are cleaner and more usable than earlier phases
- interaction feedback is clearer through stronger hover, focus, active, and loading states
- long chapter lists are more manageable because the book detail page now paginates them
- long chapter lists are easier to scan because users can filter by untranslated/translated/failed and search titles
- settings now support a practical preset-based workflow instead of a single flat config form
- settings now include a simple local backup export action
- bookshelf import tools now cover TXT, EPUB, and webpage URL preview/confirm workflows
- mobile usability is improved, especially on the bookshelf page, but not fully refined across every management page
- success/error/loading feedback is clearer than before, especially around forms and batch translation

Areas still somewhat rough:
- UI-R2 is still CSS-focused; some components could later be refactored into reusable UI primitives
- settings and glossary pages are more consistent than before but still need deeper form/table usability polish
- destructive actions now use a shared in-app confirmation dialog
- book detail pagination now supports direct page-number jumping, while reader-side chapter navigation intentionally shows a focused window instead of every chapter
- translation presets are global only; there is not yet import/export or per-book preset binding

## Known issues
- Codex app on Windows may hang on longer frontend verification commands even when the project itself is fine
- manual verification is still preferred over long Windows Codex build retries
- PowerShell input can corrupt Japanese text if entered directly; browser forms or Swagger UI are safer for UTF-8 testing
- frontend CSS may still produce non-blocking autoprefixer warnings for alignment values depending on environment/tooling
- Docker Compose scaffolding exists, but the full stack has not been repeatedly re-verified after every late-phase refinement
- the Docker smoke script is available for manual checks, but it has not been run automatically inside Codex to avoid long local Docker build retries
- webpage import relies on direct backend HTTP fetches, so pages behind login, heavy client-side rendering, or anti-bot protection may fail or import poorly
- webpage import intentionally blocks local/private network targets for NAS safety, so it cannot import pages hosted on localhost or LAN-only private IPs
- API keys are masked in read responses and redacted from provider error messages, but they are still stored unencrypted in the local SQLite database for V1 simplicity
- exported backup zip files include the SQLite database and may therefore contain saved API keys

## Current Docker / NAS status
- `docker-compose.yml`, backend Dockerfile, frontend Dockerfile, and `.env.example` are present
- `docker-compose.nas.yml`, `.env.nas.example`, and GHCR publishing workflow are present
- NAS example ports now match the common deployed mapping: frontend `13000`, backend `18000`
- NAS Compose now requires `ALLOWED_ORIGINS`, so CORS misconfiguration fails early instead of silently using localhost-only defaults
- browser-side frontend requests now use `/api/backend` by default and are proxied by Next.js to `INTERNAL_API_BASE_URL`
- this proxy mode avoids CORS for normal app usage when the external NAS URL changes
- `ALLOWED_ORIGINS` only needs exact external origins when the browser is intentionally configured to call the backend directly
- GitHub Actions now builds the frontend image with `NEXT_PUBLIC_API_BASE_URL=/api/backend` regardless of any old repository variable value
- GitHub Actions now runs backend tests and a frontend production build check before publishing matching GHCR images
- a PowerShell Docker smoke script can manually check local Compose build/startup, backend health, frontend availability, and the same-origin API proxy
- local development has been the main verification path
- GHCR-based deployment automation is now configured in the repository
- a final real-world GHCR push/pull validation on the target NAS is still recommended if it has not been exercised yet

## Git / repository status
- local git repository initialized
- project checkpoints have been committed locally
- repository has been pushed to a private GitHub repository

## Explicit non-goals still unchanged
Do NOT implement:
- automatic Narou crawling
- website scraping
- browser extension
- multi-user system
- cloud sync
- OCR
- PDF support
- TTS
- advanced AI analysis features

## Local run notes

### Backend
Typical local run:
1. activate backend virtual environment
2. `pip install -r requirements.txt`
3. `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### Frontend
Typical local run:
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Useful URLs
- frontend: `http://localhost:3000`
- backend docs: `http://localhost:8000/docs`

## Notes for future coding agents
- follow `PROJECT_SPEC.md`
- follow `AGENTS.md`
- preserve the current backend architecture
- prefer small, coherent feature slices
- do not silently expand scope
- prefer manual verification instructions for frontend if Codex app gets stuck on Windows

## Current recommended next phase
Recommended next direction:
- split the large frontend stylesheet into smaller, easier-to-maintain sections
- continue extracting reusable frontend UI primitives from repeated form, button, and feedback patterns
- consider richer reader chapter search/jump controls for very large books
- manual verification of webpage URL import against a few real article/novel pages
- consider backup restore/import later, but keep it separate because restore is riskier than export
- optionally a deployment follow-up for automatic updates such as Watchtower or pull-and-restart automation
