from pydantic import BaseModel

from app.schemas.chapter import ChapterRead


class ImportResponse(BaseModel):
    book_id: int
    book_title: str
    chapter_count: int
    chapters: list[ChapterRead]
