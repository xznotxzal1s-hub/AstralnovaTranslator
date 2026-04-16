from pydantic import AnyHttpUrl, BaseModel

from app.schemas.chapter import ChapterRead


class UrlImportRequest(BaseModel):
    url: AnyHttpUrl
    book_title: str | None = None


class ImportResponse(BaseModel):
    book_id: int
    book_title: str
    chapter_count: int
    chapters: list[ChapterRead]
