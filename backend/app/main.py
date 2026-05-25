from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401
from app.api import backup, books, chapters, glossary, imports, settings, translate, translation_jobs
from app.core.config import settings as app_settings
from app.core.database import Base, engine, ensure_schema


def create_application() -> FastAPI:
    application = FastAPI(
        title="Private Light Novel AI Translator Reader API",
        version="0.1.0",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.allowed_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(books.router)
    application.include_router(chapters.router)
    application.include_router(glossary.router)
    application.include_router(imports.router)
    application.include_router(settings.router)
    application.include_router(translate.router)
    application.include_router(translation_jobs.router)
    application.include_router(backup.router)

    @application.get("/health", tags=["health"])
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return application


Base.metadata.create_all(bind=engine)
ensure_schema()
app = create_application()
