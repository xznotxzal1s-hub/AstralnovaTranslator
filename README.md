# Private Light Novel AI Translator Reader

A small private web app for reading and translating Japanese light novel content with your own AI API credentials.

This project is designed for single-user self-hosting. The main target is a NAS or local machine running Docker Compose, with access from a desktop or mobile browser.

## Project Overview

The app currently supports:
- creating books
- creating chapters manually by pasting Japanese text
- importing `.txt` files
- importing `.epub` files
- previewing and importing webpage URLs into books/chapters
- translating chapters with user-provided AI provider settings and saved presets
- saving source text and translated text locally
- reading source text and translation in a browser
- moving between previous and next chapters from the reader page
- managing a global glossary and per-book glossary
- reusing cached translations to avoid repeated identical API calls
- deleting books and chapters
- batch translating all untranslated chapters in a book
- filtering chapter lists by status and searching chapter titles
- exporting a local backup zip from the settings page
- publishing backend/frontend Docker images to GHCR through GitHub Actions
- deploying on NAS with prebuilt images instead of local source builds
- a warmer paper-and-ink UI refinement focused on bookshelf readability, reader comfort, and consistent management pages

The project is intentionally kept small, beginner-friendly, and focused on private reading assistance.

## Current Features

### Backend
- FastAPI backend
- SQLite persistence
- `Book`, `Chapter`, `TranslationConfig`, `GlossaryEntry`, and `TranslationRecord` models
- uniqueness safeguards for translation cache keys and per-book chapter order
- lightweight versioned SQLite schema migrations tracked in a `schema_migrations` table
- settings API
- translation preset API
- prompt template validation API
- glossary API
- book/chapter CRUD APIs
- TXT import API
- EPUB import API
- webpage URL import API
- webpage URL preview API
- chapter translation API
- persisted translation job API for batch translation progress
- backup export API
- translation caching based on source hash + provider/model + prompt hash
- configurable CORS origins through `ALLOWED_ORIGINS`
- upload and webpage import size limits through `MAX_UPLOAD_MB` and `MAX_WEBPAGE_MB`
- chapter and translation changes refresh the parent book timestamp so the bookshelf ordering stays current

### Translation
- OpenAI-compatible provider support
- Gemini provider support
- configurable model, API base URL, API key, translation mode, prompt template, and chunk size
- prompt templates are validated before settings/presets are saved
- glossary-aware prompt assembly
- glossary guidance is still included when a custom prompt template does not explicitly contain `{glossary_guidance}`
- per-book glossary entries override global glossary entries
- Japanese-aware chunk splitting for long chapters, preferring paragraphs, sentence endings, dialogue closings, and ellipses before hard length fallback
- normal translation can reuse matching cached results, while retranslation bypasses the cache and calls the provider again
- backend batch translation jobs are stored in SQLite and processed sequentially in-process for single-user NAS use
- duplicate active batch translation jobs for the same book are rejected with HTTP 409
- pending/running batch jobs left behind by an app restart are marked failed with a clear interrupted message on next startup
- batch cancellation is cooperative and may take effect only after the current chapter or provider request finishes
- API keys are masked in settings read responses and preserved when the settings form submits an empty or masked key
- provider request failures redact configured API keys before errors are returned to the frontend

### Frontend
- bookshelf page
- book detail page
- chapter reading page
- settings page
- multiple saved translation presets with one active preset
- settings page validates prompt templates before saving presets
- glossary page
- global and per-book glossary management
- language switching for Simplified Chinese, English, and Japanese
- Simplified Chinese as the default UI language
- reading-focused UI refresh for chapter reading
- Continue Reading opens the saved chapter and restores the approximate scroll position
- reading progress is stored in SQLite so the saved position follows you across desktop and mobile browsers
- reader visual preferences are stored per browser/device in `localStorage`
- chapter list pagination on the book detail page
- chapter list status filtering and title search on the book detail page
- translation-only as the default reader mode, with manual bilingual and source-only switching still available
- reader display controls for font size, line height, content width, paragraph spacing, and paper/sepia/dark reader themes
- reader keyboard shortcuts: Left/Right arrows move between chapters, and `T` cycles the read mode
- compact reader chapter search/jump panel with first/current/last shortcuts and capped search results for large books
- clear previous/current/next chapter navigation above and below the reader surface
- small desktop floating previous/next reader controls
- sticky mobile reader navigation for previous/book/next
- theme-aware, denser reader chapter outline for large books
- webpage URL import form on the bookshelf page
- webpage URL import previews detected title, chapter count, and extracted text before saving
- delete actions with confirmation
- batch translation action from book detail page using persisted backend jobs and visible polling progress
- settings page backup export button
- active-page navigation highlighting
- user-friendly localized status labels
- UI-R1 bookshelf refinement with a consolidated add/import dialog and cover-style book cards
- UI-R2 visual refinement with a calmer paper-and-ink style across the app shell, bookshelf, reader, settings, and glossary pages
- Taste-skill homepage refinement with an asymmetric reading-desk first screen and no homepage icon dependency
- UI-R3 non-homepage refinement with in-app confirmation dialogs, direct chapter page links, focused reader chapter navigation, and denser settings/glossary management surfaces
- mobile bookshelf refinement with fixed bottom navigation and compact book rows

### Deployment automation
- GitHub Actions workflow to build and publish backend image to GHCR on push to `main`
- GitHub Actions workflow to build and publish frontend image to GHCR on push to `main`
- backend image publishing waits for backend unittest checks to pass
- frontend image publishing waits for a clean `npm run build` check in GitHub Actions
- Next.js production builds now use normal TypeScript and ESLint failure behavior instead of ignoring build-time errors
- local Docker smoke test script for checking Compose startup, backend health, frontend availability, and the same-origin API proxy
- separate NAS Docker Compose file that uses prebuilt GHCR images
- frontend browser requests use a same-origin `/api/backend` proxy by default, which avoids CORS issues when NAS access URLs change

## Current Limitations

This is still a V1-style private tool. A few things are intentionally simple:
- no website crawling or scraping
- webpage URL import is intentionally simple and works best for direct article / novel pages, not full-site crawling
- webpage URL import now asks you to preview extracted content before saving, but extraction quality still depends on the page structure
- no user accounts or multi-user support
- no browser extension
- no OCR, PDF, TTS, cloud sync, or advanced AI analysis features
- API keys are still stored in the local SQLite database in V1; they are masked in API read responses and redacted from provider error messages, but not encrypted at rest
- backup export uses a SQLite snapshot before zipping the database, but exported zip files still include the SQLite database and may contain saved API keys, so store them privately
- delete confirmation now uses a shared in-app confirmation dialog instead of browser-native confirm boxes
- UI-R3 adds a few reusable frontend primitives, but the stylesheet is still large and could be split further
- settings and glossary pages are usable and more visually consistent, but still need deeper form/table usability polish
- book detail chapter pagination supports direct page links, while reader-side navigation intentionally shows a focused chapter window for long books
- reader scroll progress is approximate; if translated content changes later, the restored position may be close rather than exact
- reader visual preferences are intentionally stored in browser `localStorage`, so each browser/device can have its own font, width, theme, and read-mode choices
- mobile bookshelf browsing is denser than before, but some non-bookshelf management pages may still need additional small-screen polish
- translation presets are global only and do not yet support import/export or per-book assignment
- Docker/NAS deployment files exist, but a fresh full end-to-end Docker verification is still recommended after the latest refinements
- GHCR publishing depends on GitHub repository/package setup; the frontend browser client is intentionally locked to the same-origin `/api/backend` proxy for NAS stability

## Project Structure

```text
backend/
  app/
    api/
    core/
    models/
    schemas/
    services/
    utils/
    main.py
  requirements.txt
  Dockerfile
frontend/
  app/
  components/
  lib/
  package.json
  Dockerfile
data/
uploads/
docker-compose.yml
.env.example
PROJECT_SPEC.md
AGENTS.md
README.md
.github/workflows/
docker-compose.nas.yml
.env.nas.example
```

## Local Development Setup

These steps assume Windows PowerShell.

### 1. Prepare the environment file

From the project root:

```powershell
Copy-Item .env.example .env
```

Success should look like:
- a new `.env` file appears in the project root

Useful local defaults in `.env.example`:
- `ALLOWED_ORIGINS` controls which browser origins may call the backend API.
- `NEXT_PUBLIC_API_BASE_URL=/api/backend` makes the browser call the Next.js frontend first, then the frontend proxies to the backend.
- `INTERNAL_API_BASE_URL=http://backend:8000` is used by Docker containers for frontend-to-backend server-side requests.
- `MAX_UPLOAD_MB` limits TXT/EPUB upload size.
- `MAX_WEBPAGE_MB` limits webpage URL import response size.

### 2. Start the backend

```powershell
cd D:\AstralnovaTranslator\backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Success should look like:
- the virtual environment activates
- dependencies install without errors
- the backend starts on `http://localhost:8000`
- Swagger docs open at `http://localhost:8000/docs`

### 3. Start the frontend

Open a new PowerShell window:

```powershell
cd D:\AstralnovaTranslator\frontend
npm install
npm run dev
```

Success should look like:
- dependencies install without errors
- the frontend starts on `http://localhost:3000`

### 4. Open the app

Useful URLs:
- frontend: `http://localhost:3000`
- backend docs: `http://localhost:8000/docs`
- backend health: `http://localhost:8000/health`

## What You Can Verify Locally Right Now

You can currently verify all of these manually:
- create a book from the bookshelf page
- use the asymmetric homepage import workspace to create or import books
- create a chapter by pasting Japanese text
- import a TXT file
- import an EPUB file
- preview and import a webpage URL
- use the bookshelf add/import dialog to switch between manual create, URL preview/import, TXT, and EPUB import flows
- create, edit, activate, and delete translation presets
- create global glossary entries
- create per-book glossary entries
- translate a chapter
- confirm translation cache reuse
- confirm retranslation calls the provider again instead of returning the old cached translation
- confirm settings reads show a masked API key instead of the full secret
- confirm failed provider requests do not show the full API key in the frontend error message
- confirm chapter changes or translation activity move the touched book upward in the bookshelf ordering
- confirm startup schema migrations are recorded once in `schema_migrations` and remain safe to rerun
- batch translate all untranslated chapters in a book
- confirm a second batch translation request for the same book is rejected while the first job is pending/running
- export a backup zip from the settings page
- page through long chapter lists on the book detail page
- jump directly to a chapter-list page number on the book detail page
- filter chapters by translation status and search chapter titles on the book detail page
- delete a chapter
- delete a book
- confirm destructive actions through the in-app confirmation dialog
- open a chapter with translation-only as the default reading mode
- switch manually between translation-only, source + translation, and source-only modes
- use Continue Reading from the book detail page to reopen the saved chapter and approximate scroll position
- adjust reader font size, line height, content width, paragraph spacing, and reader theme from the reading page
- use Left/Right arrow keys for previous/next chapter and `T` to cycle reader modes when not typing in a form field
- search chapter titles from the reader jump panel and use first/current/last chapter shortcuts
- use previous/next chapter controls at the top and bottom of the reader page
- switch day/night mode on the reader page and confirm the chapter outline follows the active theme

Backend regression tests can be run from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test*.py"
```

For the Integration Hardening R1 checks specifically:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_translation_jobs tests.test_backup_export tests.test_route_registration
```

For the Reader Experience R2A checks specifically:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_reading_progress tests.test_schema_migrations tests.test_route_registration
```

## Current Docker / NAS Status

The repository includes:
- `docker-compose.yml`
- `docker-compose.nas.yml`
- `.github/workflows/publish-images.yml`
- backend Dockerfile
- frontend Dockerfile
- `.env.example`
- `.env.nas.example`

Persistent directories:
- `./data` for SQLite data
- `./uploads` for imported/uploaded files

Basic Docker command:

```powershell
docker compose up --build
```

Expected URLs after startup:
- frontend: `http://localhost:3000`
- backend docs: `http://localhost:8000/docs`

Important note:
- Docker/NAS support is part of the project structure and earlier setup work, but the main verification path recently has been local manual testing rather than repeated full Docker retesting after every refinement

### Optional Docker smoke test

For a quick local confidence check, use the PowerShell smoke script from the project root:

```powershell
Copy-Item .env.example .env
.\scripts\smoke-docker.ps1
```

The script will:
- build the Docker images with `docker compose build`
- start the stack with `docker compose up -d`
- check `http://localhost:18000/health`
- check `http://localhost:13000`
- check the frontend same-origin proxy at `http://localhost:13000/api/backend/health`
- stop the stack with `docker compose down`

If the images are already built and you only want a faster startup check:

```powershell
.\scripts\smoke-docker.ps1 -SkipBuild
```

Success should end with:

```text
[ok] Docker smoke test completed successfully.
```

## GitHub Actions + GHCR Setup

The project now supports automatic Docker image publishing to GitHub Container Registry (GHCR).

Before publishing images, the workflow now runs:
- backend dependency install plus `python -m unittest discover -s tests -p "test*.py"`
- frontend dependency install plus `npm run build`

If either quality gate fails, the matching Docker image is not published.

### What gets published

On push to `main`, GitHub Actions builds and pushes:
- `ghcr.io/YOUR_GITHUB_USERNAME_OR_ORG/astralnova-translator-backend:latest`
- `ghcr.io/YOUR_GITHUB_USERNAME_OR_ORG/astralnova-translator-frontend:latest`

It also publishes SHA-based tags for rollback/debugging.

### GitHub repository setup

Required:
1. Push this repository to GitHub
2. Make sure the default branch is `main`
3. Open the repository `Settings`
4. Under `Actions > General`, allow workflows to run
5. Under `Actions > General`, make sure the workflow has permission to read repository contents and write packages if your organization restricts defaults

### GitHub variable

The frontend browser client is locked to the same-origin proxy path:

- Name: `NEXT_PUBLIC_API_BASE_URL`
- Value: `/api/backend`

You may also delete this repository variable; the workflow now builds with `/api/backend` directly.

Do not set this variable to an absolute NAS backend URL such as `http://192.168.178.54:18000`. The browser-side frontend no longer needs that value, and using same-origin proxying avoids CORS problems when Tailscale or tunnel URLs change.

### GitHub secrets

For image publishing itself, no custom repository secret is required if you use the built-in `GITHUB_TOKEN`.

The workflow already uses:
- `secrets.GITHUB_TOKEN`

You only need extra secrets later if you choose to add automated remote deployment or webhook-based updates.

## GHCR-Based NAS Deployment

### 1. Prepare NAS files

On the NAS, place these files in your deployment folder:
- `docker-compose.nas.yml`
- `.env.nas` copied from `.env.nas.example`

Create `.env.nas` from the example and update at least:

```env
BACKEND_IMAGE=ghcr.io/YOUR_GITHUB_USERNAME_OR_ORG/astralnova-translator-backend:latest
FRONTEND_IMAGE=ghcr.io/YOUR_GITHUB_USERNAME_OR_ORG/astralnova-translator-frontend:latest
BACKEND_PORT=18000
FRONTEND_PORT=13000
NEXT_PUBLIC_API_BASE_URL=/api/backend
INTERNAL_API_BASE_URL=http://backend:8000
ALLOWED_ORIGINS=http://YOUR_NAS_IP_OR_DOMAIN:13000
MAX_UPLOAD_MB=50
MAX_WEBPAGE_MB=5
```

Important:
- `NEXT_PUBLIC_API_BASE_URL=/api/backend` means the browser calls the frontend origin, and Next.js proxies the request to the backend.
- `INTERNAL_API_BASE_URL=http://backend:8000` must stay reachable from the frontend container.
- This proxy mode works better with Tailscale, reverse proxy, and NAS tunnel URLs because the external frontend URL can change without creating a new CORS origin.
- `ALLOWED_ORIGINS` mainly matters for direct backend testing through Swagger or scripts from a browser origin. Normal app usage should go through `/api/backend`.

### 2. Log in to GHCR on the NAS

If the packages are private, create a GitHub Personal Access Token with package read access and log in:

```powershell
docker login ghcr.io -u YOUR_GITHUB_USERNAME
```

When prompted, paste your token.

### 3. Pull and start the stack

From the NAS deployment folder:

```powershell
docker compose -f docker-compose.nas.yml --env-file .env.nas pull
docker compose -f docker-compose.nas.yml --env-file .env.nas up -d
```

Success should look like:
- backend container starts from the GHCR backend image
- frontend container starts from the GHCR frontend image
- the app opens without needing to upload source code to the NAS

### 4. Update later

After a new push to `main` finishes publishing images:

```powershell
docker compose -f docker-compose.nas.yml --env-file .env.nas pull
docker compose -f docker-compose.nas.yml --env-file .env.nas up -d
```

That is the new normal deployment flow.

## Optional Automatic Updates Later

If you later want fully automatic updates, you can add Watchtower as a separate optional layer.

An example file is included:
- `docker-compose.watchtower.example.yml`

This is intentionally separate so the main deployment stays simple and easy to understand first.

## Roadmap / Next Steps

Recommended next work:
- split the large global stylesheet into smaller, easier-to-maintain style modules or component sections
- continue extracting reusable frontend UI primitives so future UI passes are less CSS-heavy
- refine reader navigation search/jump controls for books with hundreds of chapters
- more manual verification against real-world webpage layouts if URL import becomes part of the regular workflow
- consider backup restore/import later, after export has been used safely
- optional automatic update flow after GHCR-based deployment is stable
- final Docker Compose / NAS verification pass after the latest frontend changes
- polish confirmation UX and higher-density long-list management flows
- complete any remaining V1 cleanup and documentation improvements

## Non-Goals

Still out of scope for V1:
- automatic Narou crawling
- bulk website scraping
- browser extension
- multi-user accounts
- social or sharing features
- cloud sync
- OCR
- PDF support
- TTS
- advanced AI analysis features

## Notes

- If PowerShell mangles Japanese text input, browser forms or Swagger UI usually work better for UTF-8 testing
- On Windows, long frontend verification commands inside Codex can sometimes hang even when the project itself is fine
- Codex should not run local frontend production builds (`npm run build`) unless explicitly allowed; GitHub Actions is the source of truth for production build verification
- Codex should not run Docker build/up or Docker smoke tests unless explicitly allowed; the smoke script is available for manual verification
- Manual verification is preferred when Windows Codex build runs become unreliable
- TypeScript incremental build cache files such as `frontend/tsconfig.tsbuildinfo` are ignored and should not be committed
