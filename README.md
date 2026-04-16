# Private Light Novel AI Translator Reader

A small private web app for reading and translating Japanese light novel content with your own AI API credentials.

This project is designed for single-user self-hosting. The main target is a NAS or local machine running Docker Compose, with access from a desktop or mobile browser.

## Project Overview

The app currently supports:
- creating books
- creating chapters manually by pasting Japanese text
- importing `.txt` files
- importing `.epub` files
- translating chapters with user-provided AI provider settings
- saving source text and translated text locally
- reading source text and translation in a browser
- managing a global glossary and per-book glossary
- reusing cached translations to avoid repeated identical API calls
- deleting books and chapters
- batch translating all untranslated chapters in a book
- publishing backend/frontend Docker images to GHCR through GitHub Actions
- deploying on NAS with prebuilt images instead of local source builds

The project is intentionally kept small, beginner-friendly, and focused on private reading assistance.

## Current Features

### Backend
- FastAPI backend
- SQLite persistence
- `Book`, `Chapter`, `TranslationConfig`, `GlossaryEntry`, and `TranslationRecord` models
- settings API
- glossary API
- book/chapter CRUD APIs
- TXT import API
- EPUB import API
- chapter translation API
- translation caching based on source hash + provider/model + prompt hash

### Translation
- OpenAI-compatible provider support
- Gemini provider support
- configurable model, API base URL, API key, translation mode, prompt template, and chunk size
- glossary-aware prompt assembly
- per-book glossary entries override global glossary entries
- sequential chunk translation for long chapters

### Frontend
- bookshelf page
- book detail page
- chapter reading page
- settings page
- glossary page
- global and per-book glossary management
- language switching for Simplified Chinese, English, and Japanese
- Simplified Chinese as the default UI language
- reading-focused UI refresh for chapter reading
- chapter list pagination on the book detail page
- translation-only as the default reader mode, with manual bilingual switching still available
- delete actions with confirmation
- batch translation action from book detail page
- active-page navigation highlighting
- user-friendly localized status labels

### Deployment automation
- GitHub Actions workflow to build and publish backend image to GHCR on push to `main`
- GitHub Actions workflow to build and publish frontend image to GHCR on push to `main`
- separate NAS Docker Compose file that uses prebuilt GHCR images
- frontend build-time `NEXT_PUBLIC_API_BASE_URL` preserved in automated image builds

## Current Limitations

This is still a V1-style private tool. A few things are intentionally simple:
- no website crawling or scraping
- no user accounts or multi-user support
- no browser extension
- no OCR, PDF, TTS, cloud sync, or advanced AI analysis features
- delete confirmation currently uses browser confirm dialogs, not custom modals
- settings and glossary pages are usable, but less polished than the reading page
- chapter pagination is intentionally simple and currently uses previous/next paging rather than direct page-number jumping
- Docker/NAS deployment files exist, but a fresh full end-to-end Docker verification is still recommended after the latest refinements
- GHCR publishing depends on GitHub repository/package setup and a correct `NEXT_PUBLIC_API_BASE_URL` repository variable

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
- create a chapter by pasting Japanese text
- import a TXT file
- import an EPUB file
- configure translation settings
- create global glossary entries
- create per-book glossary entries
- translate a chapter
- confirm translation cache reuse
- batch translate all untranslated chapters in a book
- page through long chapter lists on the book detail page
- delete a chapter
- delete a book
- open a chapter with translation-only as the default reading mode
- switch manually between translation-only mode and source + translation mode

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

## GitHub Actions + GHCR Setup

The project now supports automatic Docker image publishing to GitHub Container Registry (GHCR).

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

Set this repository variable:

- Name: `NEXT_PUBLIC_API_BASE_URL`
- Value: your browser-accessible backend URL, for example `http://YOUR_NAS_IP:8000`

This value is important because the frontend needs it during the Docker build, not only at runtime.

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
NEXT_PUBLIC_API_BASE_URL=http://YOUR_NAS_IP_OR_DOMAIN:8000
INTERNAL_API_BASE_URL=http://backend:8000
```

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
- another UI-focused refinement pass for management pages and smaller interaction details
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
- Manual verification is preferred when Windows Codex build runs become unreliable
