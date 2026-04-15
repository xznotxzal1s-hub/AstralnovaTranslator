from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import books, chapters, imports, settings, translate
from app.core.database import Base, engine


def create_application() -> FastAPI:
    application = FastAPI(
        title="Private Light Novel AI Translator Reader API",
        version="0.1.0",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(books.router)
    application.include_router(chapters.router)
    application.include_router(imports.router)
    application.include_router(settings.router)
    application.include_router(translate.router)

    @application.get("/health", tags=["health"])
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return application


Base.metadata.create_all(bind=engine)
app = create_application()
