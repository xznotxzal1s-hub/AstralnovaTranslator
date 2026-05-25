# AstralnovaTranslator

A private, self-hosted light novel translation reader for one user.

AstralnovaTranslator helps you import Japanese novel text, translate chapters with your own AI API credentials, save everything locally, and read in a browser on desktop or mobile. It is designed for a NAS or local machine running Docker Compose.

This project is for personal reading assistance only. It is not a public sharing or distribution platform.

## Current Features

### Reading and library
- Create, rename, and delete books.
- Create, delete, and read chapters.
- Import TXT and EPUB files.
- Preview and import a single webpage URL into the existing book/chapter workflow.
- View books on a bookshelf page and manage chapters from a book detail page.
- Paginate, filter, and search long chapter lists.
- Continue Reading opens the saved chapter and restores the approximate scroll position.
- Reading progress is stored in SQLite, so it can follow you across browsers/devices that use the same NAS.
- Reader preferences are stored in browser `localStorage`, so font/theme choices are per browser/device.
- Reader modes: translation-only, source + translation, and source-only.
- Reader controls: font size, line height, content width, paragraph spacing, and paper/sepia/dark reader themes.
- Keyboard shortcuts in the reader: Left/Right arrows move chapters, `T` cycles read mode.

### Translation
- Configure OpenAI-compatible and Gemini providers.
- Save multiple translation presets and choose one active preset.
- Configure API base URL, API key, model name, prompt template, chunk size, and translation mode.
- Validate prompt templates before saving.
- Translate a single chapter.
- Retranslate a chapter while bypassing the existing translation cache.
- Batch translate untranslated chapters from the book detail page through a simple persisted job.
- Cache translations using source hash + provider/model + prompt hash to avoid repeated identical API calls.
- Inject global and per-book glossary entries into translation prompts, with per-book glossary entries taking priority.
- Split long Japanese text with paragraph/sentence-aware chunking.

### Safety and operations
- SQLite database and uploads are stored in mounted local directories.
- Upload and webpage import size limits are configurable.
- URL import blocks unsafe local/private network targets.
- API keys are masked in read responses and redacted from provider errors.
- Backup export creates a zip with a SQLite snapshot, uploads, and metadata.
- Backend tests and frontend production build checks run in GitHub Actions before GHCR images are published.
- Frontend browser requests use the same-origin `/api/backend` proxy by default, which avoids CORS issues when NAS access URLs change.

## Current Limitations

- Single-user only. There is no login, account system, role system, or multi-user permission model.
- No website crawling or bulk scraping. URL import is for one page at a time.
- URL import works best with normal article/novel pages. Pages behind login, heavy client-side rendering, or anti-bot protection may fail.
- No browser extension, OCR, PDF import, TTS, cloud sync, public sharing, or social features.
- API keys are stored in local SQLite for V1 simplicity. They are masked/redacted in API responses, but not encrypted at rest.
- Backup zip files may contain saved API keys because they include a SQLite database snapshot. Store backups privately.
- Batch translation jobs are simple in-process jobs. If the backend restarts, pending/running jobs are marked failed and should be restarted manually.
- Batch cancellation is cooperative and may take effect only after the current chapter/provider request finishes.
- Reader scroll restoration is approximate, especially if translation text changes after progress was saved.
- The global stylesheet is still large and should eventually be split into smaller style modules.

## Project Structure

```text
backend/
  app/
    api/          FastAPI route modules
    core/         config, database, lightweight schema migrations
    models/       SQLAlchemy models
    schemas/      Pydantic schemas
    services/     business logic
    utils/        import, text, and translation helpers
    main.py       FastAPI app entrypoint
  tests/          backend unittest suite
  Dockerfile
  requirements.txt

frontend/
  app/            Next.js App Router pages and API proxy
  components/     UI components
  lib/            API helpers, i18n, shared types
  Dockerfile
  package.json

data/             local SQLite data volume, ignored by git
uploads/          local upload volume, ignored by git
docker-compose.yml
docker-compose.nas.yml
.env.example
.env.nas.example
```

## Local Development Setup

These commands are for Windows PowerShell.

### 1. Prepare environment files

From the project root:

```powershell
Copy-Item .env.example .env
```

Edit `.env` if you want different ports, upload limits, or initial provider defaults.

### 2. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Success looks like:
- the terminal says Uvicorn is running
- `http://localhost:8000/health` returns `{"status":"ok"}`
- `http://localhost:8000/docs` opens Swagger UI

### 3. Start the frontend

Open a second PowerShell window:

```powershell
cd frontend
npm install
npm run dev
```

Success looks like:
- Next.js starts on port `3000`
- `http://localhost:3000` opens the bookshelf page

### 4. Basic local verification

In the browser:
- Create a book.
- Open the book detail page.
- Create a chapter by pasting Japanese text.
- Configure a translation preset in Settings.
- Translate the chapter.
- Read the translated chapter.
- Scroll in the reader, leave the page, then use Continue Reading to confirm progress is restored.
- Try TXT, EPUB, or webpage URL import if needed.

## Verification Commands

Backend tests from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test*.py"
```

Reader Experience R2A targeted tests:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_reading_progress tests.test_schema_migrations tests.test_route_registration
```

Lightweight frontend TypeScript check from `frontend/`:

```powershell
npm exec tsc -- --noEmit --incremental false
```

Important for Codex/agent sessions:
- Do not run local `npm run build` in Codex unless explicitly allowed.
- Do not run Docker build/up/smoke tests in Codex unless explicitly allowed.
- GitHub Actions is the source of truth for frontend production build verification.

## Docker and NAS Deployment

### Local Docker Compose

For a normal local Docker run:

```powershell
docker compose up --build
```

The default local mapping is:
- frontend: `http://localhost:3000`
- backend: `http://localhost:8000`

### GHCR-based NAS deployment

NAS deployment should use prebuilt GHCR images instead of uploading source code manually.

1. Copy these files to a folder on the NAS:
   - `docker-compose.nas.yml`
   - `.env.nas.example`

2. Rename `.env.nas.example` to `.env.nas`.

3. Set image names and ports in `.env.nas`, for example:

```env
BACKEND_IMAGE=ghcr.io/xznotxzal1s-hub/astralnova-translator-backend:latest
FRONTEND_IMAGE=ghcr.io/xznotxzal1s-hub/astralnova-translator-frontend:latest
BACKEND_PORT=18000
FRONTEND_PORT=13000
NEXT_PUBLIC_API_BASE_URL=/api/backend
INTERNAL_API_BASE_URL=http://backend:8000
```

4. Set `ALLOWED_ORIGINS`.

For the main frontend UI, browser requests go through `/api/backend`, so changing NAS access URLs is much less fragile than direct backend CORS. `ALLOWED_ORIGINS` is still useful for direct backend/Swagger access from a browser.

5. Pull and start:

```powershell
docker compose -f docker-compose.nas.yml --env-file .env.nas pull
docker compose -f docker-compose.nas.yml --env-file .env.nas up -d
```

6. Update later:

```powershell
docker compose -f docker-compose.nas.yml --env-file .env.nas pull
docker compose -f docker-compose.nas.yml --env-file .env.nas up -d
```

### Optional Docker smoke test

A manual smoke script exists for local confidence checks:

```powershell
.\scripts\smoke-docker.ps1
```

It builds and starts Docker Compose, checks backend health, checks frontend availability, checks the same-origin API proxy, and then cleans up. Do not run this from Codex unless explicitly allowed.

## GitHub Actions and GHCR

The repository includes `.github/workflows/publish-images.yml`.

On push to `main`, GitHub Actions:
- installs backend dependencies and runs backend unittest checks
- installs frontend dependencies and runs `npm run build`
- publishes separate backend and frontend images to GHCR only after the matching checks pass

Repository/package setup needed:
- GitHub Actions must have permission to write packages.
- GHCR packages should be visible to the NAS account or made public/private as desired.
- `GHCR_USERNAME` and `GHCR_TOKEN` may be needed on the NAS for pulling private images.

## Roadmap / Next Steps

Good next steps:
- Manually verify the new reader progress/preferences flow on desktop and mobile.
- Split the large global stylesheet into smaller maintainable sections.
- Continue extracting reusable UI primitives from repeated buttons, panels, forms, and feedback messages.
- Improve settings and glossary form/table usability.
- Add provider connection testing and model-list helpers.
- Consider backup restore later, but keep it separate because restore is riskier than export.
- Optionally add Watchtower or another NAS auto-update flow after GHCR deployment remains stable.

## Non-Goals

Do not add these unless explicitly requested:
- public sharing or distribution
- user registration/login
- multi-user permissions
- bulk website crawling
- browser extension
- OCR
- PDF import
- TTS
- cloud sync
- social features
- complex distributed workers such as Redis/Celery

## Notes for Future Agents

- Follow `PROJECT_SPEC.md` first, then `AGENTS.md`.
- Keep the app simple, private, NAS-friendly, and beginner-friendly.
- Avoid unrelated product scope.
- Prefer backend unittest and lightweight frontend inspection inside Codex.
- Do not claim frontend production build or Docker smoke success unless those commands were actually run in an allowed environment.
