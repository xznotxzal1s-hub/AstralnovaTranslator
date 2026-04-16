# HANDOFF_STATUS.md

## Project
AstralnovaTranslator

## Current status
The project is now functionally through Phase 6A and has been manually verified locally in slices as the work progressed.

The app currently supports:
- creating books
- creating chapters by pasting Japanese text
- importing TXT files
- importing EPUB files
- configuring translation providers and prompts
- translating single chapters
- reusing cached translations
- using global and per-book glossary entries
- reading chapters in a reading-focused UI
- deleting books and chapters
- batch translating all untranslated chapters in a book
- publishing backend/frontend Docker images to GHCR via GitHub Actions
- NAS deployment with prebuilt images through a separate Compose file

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

### Phase 5A
Completed and verified locally:
- usable settings page connected to backend settings API
- usable glossary page with CRUD
- better loading/success/error feedback in forms and translation actions

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

### Deployment automation
Implemented:
- GitHub Actions workflow for backend image publishing to GHCR
- GitHub Actions workflow for frontend image publishing to GHCR
- separate NAS Compose file using image tags instead of local build contexts
- frontend build-time `NEXT_PUBLIC_API_BASE_URL` wired through automated image builds

## Verified functionality

Verified working locally at this point:
- backend starts
- frontend starts
- books can be created from UI
- chapters can be created manually from UI
- TXT import works
- EPUB import works for simple valid files
- settings can be saved
- glossary entries can be created, edited, and deleted
- per-book glossary entries stay scoped to the correct book
- chapter translation works with configured providers
- glossary-aware translation prompt logic works
- translation cache prevents repeated identical provider calls
- translated content persists after restart
- books can be deleted
- chapters can be deleted
- batch translation works sequentially from the book detail page

## Current UI / UX status

Current UI state:
- the app is now reading-focused rather than a rough admin-style interface
- the chapter reading page has the strongest polish and is the best current experience
- bookshelf and book detail pages are cleaner and more usable than earlier phases
- mobile usability is improved, but not fully refined
- success/error/loading feedback is clearer than before, especially around forms and batch translation

Areas still somewhat rough:
- settings and glossary pages are usable but visually less polished than the reader pages
- some backend status values are still shown fairly literally
- destructive actions currently use browser confirm dialogs rather than custom modal UI

## Known issues
- Codex app on Windows may hang on longer frontend verification commands even when the project itself is fine
- manual verification is still preferred over long Windows Codex build retries
- PowerShell input can corrupt Japanese text if entered directly; browser forms or Swagger UI are safer for UTF-8 testing
- frontend CSS may still produce non-blocking autoprefixer warnings for alignment values depending on environment/tooling
- Docker Compose scaffolding exists, but the full stack has not been repeatedly re-verified after every late-phase refinement

## Current Docker / NAS status
- `docker-compose.yml`, backend Dockerfile, frontend Dockerfile, and `.env.example` are present
- `docker-compose.nas.yml`, `.env.nas.example`, and GHCR publishing workflow are present
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
- a UI-focused follow-up phase to polish management pages and smaller interaction details
- optionally a deployment follow-up for automatic updates such as Watchtower or pull-and-restart automation
