# AGENTS.md

## Project name

Private Light Novel AI Translator Reader

## Project purpose

This is a private, self-hosted web app for a single user to read and translate Japanese light novel content.

The app will run on a NAS with Docker Compose and be accessed through a browser on desktop and mobile devices.

This project is for personal reading assistance only.

## Product summary

The app should allow the user to:

- create books
- create chapters manually by pasting Japanese text
- import `.txt` files
- import `.epub` files
- translate chapters using user-provided AI API credentials
- save source text and translated text locally
- read translated chapters in a browser
- manage a simple glossary
- retranslate chapters when needed

This project must not implement public-sharing or distribution features.

---

## Source of truth

Always follow these files in this priority order:

1. `PROJECT_SPEC.md`
2. `AGENTS.md`

If implementation details are unclear, prefer the simplest solution that matches the spec.

Do not invent extra product scope unless explicitly requested.

---

## Non-goals

Do NOT implement the following in V1:

- automatic crawling of Narou or any other novel website
- bulk website scraping
- browser extension
- user registration or login
- multi-user support
- social features
- cloud sync
- OCR
- PDF import
- TTS
- advanced search
- role graph / plot analysis / extra AI features
- overly complex background job architecture
- production-grade distributed infrastructure

If you think one of these features is needed, do not implement it automatically. Leave a note instead.

---

## Tech stack requirements

Use this stack unless the user explicitly changes it:

### Frontend
- Next.js
- React
- TypeScript

### Backend
- FastAPI
- Python 3.11+

### Database
- SQLite

### Deployment
- Docker
- Docker Compose

### Storage
- local filesystem volumes for uploads and data

Keep the architecture simple and maintainable.

---

## Architecture principles

1. Prefer small, readable modules.
2. Avoid single-file monoliths.
3. Avoid overengineering.
4. Keep the code beginner-friendly.
5. Make local development easy.
6. Make Docker deployment easy.
7. Optimize for single-user private usage.
8. Use clear file names and predictable structure.
9. Add comments where helpful, but do not over-comment trivial code.
10. Use environment variables for configurable settings when practical.

---

## Project structure

Use a structure close to:

project-root/
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

If you need to slightly adjust this structure, keep it simple and explain why.

---

## Backend guidelines

### FastAPI
- Use FastAPI for all backend APIs.
- Organize routes by domain.
- Keep business logic out of route handlers when possible.
- Use Pydantic models for request/response schemas.
- Use SQLAlchemy or SQLModel for SQLite access. Prefer the simplest stable option.

### Data model domains
At minimum, support:
- Book
- Chapter
- TranslationConfig
- GlossaryEntry
- TranslationRecord

### API domains
At minimum, implement:
- books
- chapters
- import
- translate
- settings
- glossary

### Storage
- SQLite database should live in a mounted data directory.
- Uploaded files should live in a mounted uploads directory.
- Make paths configurable through environment variables.

### Translation logic
- Implement provider abstraction.
- Support at least:
  - OpenAI-compatible provider
  - Gemini provider
- Keep provider code separated from route handlers.
- Design translation calls so additional providers can be added later.

### Translation behavior
- Split large chapter text into chunks before sending to API.
- Reassemble translated chunks in order.
- Store completed translated text in database.
- Cache translation results using source hash + provider/model/prompt info.
- Do not resend identical translation work unnecessarily.

### Error handling
- Fail gracefully.
- Return clear API errors.
- Log useful debugging information.
- Avoid crashing the whole app because one translation call failed.

---

## Frontend guidelines

### General
- Use Next.js with TypeScript.
- Keep the UI simple and reading-focused.
- Prioritize usability over flashy design.
- Make the app work on desktop and mobile.

### Required pages
- bookshelf page
- book detail page
- chapter reading page
- settings page
- glossary page

### UI priorities
- readable text
- simple navigation
- clear buttons for import / translate / retranslate
- chapter list visibility
- reading mode toggle:
  - translation only
  - source + translation

### Styling
- Keep styling clean and lightweight.
- Prefer a simple modern look.
- Do not spend excessive effort on visual polish before core functionality works.

---

## Import guidelines

### TXT
- Support `.txt` upload.
- Assume UTF-8 first.
- If chapter splitting is unclear, import as a single chapter.

### EPUB
- Support `.epub` upload.
- Extract useful text chapters only.
- Ignore obvious non-content pages when practical.
- Keep EPUB parsing robust but simple.

### Manual paste
- Must support direct creation of a chapter by pasting Japanese text.

---

## Settings guidelines

The app should let the user configure:

- provider type
- API base URL if needed
- API key
- model name
- prompt template
- translation mode
- chunk size

For V1, a simple settings screen is enough.

Do not implement account systems or complex secret management.

If API keys are stored in the database in V1, keep the implementation simple and document it clearly.

---

## Glossary guidelines

Implement a simple glossary system.

Each glossary entry should have:
- source term
- target term
- optional note

Glossary entries should be included in translation prompts.

Do not build a complex terminology engine in V1.

---

## Docker guidelines

The project must support Docker Compose.

Minimum services:
- frontend
- backend

Persist:
- database/data directory
- uploads directory

Provide:
- `docker-compose.yml`
- backend Dockerfile
- frontend Dockerfile
- `.env.example`

Use practical defaults.

Do not add extra infrastructure unless necessary.

Avoid adding Redis, Celery, message queues, or reverse proxies in V1 unless absolutely required.

---

## Development workflow

When working on this project:

1. read `PROJECT_SPEC.md`
2. follow `AGENTS.md`
3. inspect existing files before changing structure
4. make incremental changes
5. prefer finishing one working slice over scattering unfinished code
6. keep commits or changes coherent by feature area

When adding features, prioritize this order:

1. backend foundation
2. database models
3. book/chapter CRUD
4. manual paste import
5. translation configuration
6. translation execution
7. reading page
8. txt import
9. epub import
10. glossary
11. caching refinements
12. mobile polish

---

## Implementation phases

Build the project in phases.

### Phase 1
Backend foundation:
- FastAPI app
- SQLite setup
- Book and Chapter models
- basic CRUD APIs

### Phase 2
Translation basics:
- settings/config storage
- OpenAI-compatible provider
- Gemini provider
- chapter translation endpoint

### Phase 3
Frontend basics:
- bookshelf page
- book detail page
- chapter reading page

### Phase 4
Import features:
- manual paste import
- txt import
- epub import

### Phase 5
Refinement:
- glossary
- translation cache
- reading mode toggle
- mobile improvements
- Docker polish

Do not try to finish all phases at once unless explicitly asked.

---

## Coding style

### Python
- Use type hints.
- Use clear function names.
- Keep functions focused.
- Prefer explicit code over clever tricks.

### TypeScript
- Use typed interfaces/types.
- Avoid unnecessary abstraction.
- Keep components focused and readable.

### Naming
Use descriptive names.
Avoid vague names like:
- data1
- helper2
- tempStuff

---

## Testing and validation

For each major feature, validate that it actually works.

At minimum, verify:
- API server starts
- frontend starts
- books can be created
- chapters can be created
- chapter translation endpoint works
- translated content persists after restart
- txt import works
- epub import works for at least simple valid files
- Docker Compose starts the full stack

If something is incomplete, state it clearly.

Do not pretend a feature works if it has not been verified.

---

## Documentation requirements

Keep documentation practical.

At minimum, provide:
- README.md
- setup instructions
- local development instructions
- Docker Compose usage
- environment variable explanation

README should be beginner-friendly.

Explain how to:
- start locally
- start with Docker Compose
- configure API keys
- access the web UI

---

## Behavior expectations for the coding agent

When making decisions:
- prefer the simplest working solution
- prefer maintainability over cleverness
- do not silently expand scope
- do not rewrite the whole project unnecessarily
- do not introduce unrelated dependencies
- explain structural changes briefly

If you are unsure:
- leave a concise note
- pick the safer/smaller option

If the spec conflicts with convenience:
- follow the spec

---

## V1 acceptance criteria

V1 is acceptable when:

1. user can create a book
2. user can paste Japanese text as a chapter
3. user can configure a provider and API key
4. user can translate a chapter
5. translation is saved locally
6. page refresh does not lose data
7. app is usable in desktop and mobile browser
8. txt import works
9. epub import works at a basic level
10. app starts via Docker Compose

---

## Final reminder

This is a small private reading tool for one user.

Keep it simple.
Keep it modular.
Keep it working.
Do not turn V1 into a giant platform.