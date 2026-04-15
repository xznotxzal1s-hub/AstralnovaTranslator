# HANDOFF_STATUS.md

## Project
AstralnovaTranslator

## Current status
The project has completed Phase 1, Phase 2, and Phase 3 local verification.

## Completed phases

### Phase 1
Completed and verified locally:
- FastAPI backend scaffold
- SQLite integration
- Book and Chapter models
- Book and Chapter CRUD APIs
- frontend skeleton
- Docker/basic project structure

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

Verified working end-to-end:
- create book
- create chapter
- save Japanese source text
- translate chapter through API
- save translated Chinese text
- retrieve saved translated chapter

### Phase 3
Completed and manually verified locally:
- bookshelf page
- book detail page
- chapter reading page
- create book from UI
- create chapter from UI
- trigger translation from UI
- read source and translated text from UI

## Important verification notes

### Windows / Codex app issue
Codex app on Windows sometimes hangs while running frontend build commands.
However, manual verification succeeded.

Manual frontend verification that succeeded:
- `npm run build`
- `npm run dev`

Frontend build completed successfully manually.

This appears to be a Codex app runtime/environment issue on Windows, not a confirmed project code failure.

## Known issues
- frontend CSS has autoprefixer warnings about `start` / `end` values; not blocking
- Codex app may hang on long frontend build verification in Windows
- PowerShell input may corrupt Japanese text if entered directly; Swagger UI or browser form input works better for UTF-8 verification

## Git / repository status
- local git repository initialized
- checkpoint committed locally
- pushed successfully to private GitHub repository

## Current repository purpose
Private self-hosted AI light novel translator/reader for personal use.

## Current recommended next phase
Phase 4:
- txt import
- epub import

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
- preserve current backend architecture
- prefer small incremental changes
- avoid long-running automatic Windows frontend verification inside Codex app when possible
- prefer manual verification instructions for frontend if Codex app gets stuck

## Next objective
Implement Phase 4 only:
- txt import backend + UI flow
- epub import backend + UI flow
- keep scope small and maintainable