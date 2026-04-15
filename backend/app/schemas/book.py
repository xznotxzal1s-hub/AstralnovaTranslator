from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.chapter import ChapterRead


class BookBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class BookCreate(BookBase):
    pass


class BookUpdate(BookBase):
    pass


class BookListItem(BookBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookRead(BookListItem):
    chapters: list[ChapterRead] = Field(default_factory=list)
