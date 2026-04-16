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
- delete actions with confirmation
- batch translation action from book detail page

## Current Limitations

This is still a V1-style private tool. A few things are intentionally simple:
- no website crawling or scraping
- no user accounts or multi-user support
- no browser extension
- no OCR, PDF, TTS, cloud sync, or advanced AI analysis features
- delete confirmation currently uses browser confirm dialogs, not custom modals
- settings and glossary pages are usable, but less polished than the reading page
- some backend status values are still shown fairly literally in the UI
- Docker/NAS deployment files exist, but a fresh full end-to-end Docker verification is still recommended after the latest refinements

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
- delete a chapter
- delete a book
- read chapters in source + translation mode or translation-only mode

## Current Docker / NAS Status

The repository includes:
- `docker-compose.yml`
- backend Dockerfile
- frontend Dockerfile
- `.env.example`

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

## Roadmap / Next Steps

Recommended next work:
- another UI-focused refinement pass for management pages and smaller interaction details
- final Docker Compose / NAS verification pass after the latest frontend changes
- polish status labels and confirmation UX
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
