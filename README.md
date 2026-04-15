# Private Light Novel AI Translator Reader

This repository contains the Phase 1 scaffold for a private, self-hosted light novel translation reader.

Current scope:

- FastAPI backend foundation
- SQLite setup
- `Book` and `Chapter` models
- basic CRUD APIs
- Docker setup for backend and frontend
- minimal Next.js frontend skeleton

Not implemented yet:

- translation providers
- settings storage
- glossary
- TXT import
- EPUB import
- reading UI

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
frontend/
  app/
  components/
  lib/
data/
uploads/
docker-compose.yml
.env.example
README.md
```

## Backend API in Phase 1

Books:

- `GET /books`
- `POST /books`
- `GET /books/{id}`
- `PUT /books/{id}`
- `DELETE /books/{id}`

Chapters:

- `POST /books/{id}/chapters`
- `GET /books/{id}/chapters`
- `GET /chapters/{id}`
- `PUT /chapters/{id}`
- `DELETE /chapters/{id}`

Health:

- `GET /health`

## Local Setup

### 1. Prepare environment

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

### 2. Start the backend locally

Create a virtual environment and install dependencies:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run the API:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### 3. Start the frontend locally

In a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend will be available at:

- `http://localhost:3000`

## Docker Compose

Start the full stack:

```powershell
docker compose up --build
```

Then open:

- frontend: `http://localhost:3000`
- backend docs: `http://localhost:8000/docs`

## Data Persistence

- SQLite data is stored in `./data`
- uploaded files will be stored in `./uploads`

These directories are mounted in Docker Compose so data persists across restarts.

## Notes

- This Phase 1 scaffold intentionally does not include crawling, scraping, login, or translation features yet.
- The frontend is currently a minimal placeholder so the Docker setup already includes both required services.
