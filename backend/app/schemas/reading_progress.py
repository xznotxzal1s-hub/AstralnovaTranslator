from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReadingProgressUpdate(BaseModel):
    chapter_id: int
    progress_percent: int = Field(ge=0, le=100)


class ReadingProgressResponse(BaseModel):
    book_id: int
    chapter_id: int | None
    progress_percent: int
    updated_at: datetime | None
    fallback_used: bool

    model_config = ConfigDict(from_attributes=True)
