from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChapterBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    source_text: str = Field(min_length=1)


class ChapterCreate(ChapterBase):
    pass


class ChapterUpdate(ChapterBase):
    pass


class ChapterRead(ChapterBase):
    id: int
    book_id: int
    index_in_book: int
    translated_text: str | None
    source_hash: str | None
    translation_status: str
    last_translated_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
