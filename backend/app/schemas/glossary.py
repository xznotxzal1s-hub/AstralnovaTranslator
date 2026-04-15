from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GlossaryEntryBase(BaseModel):
    source_term: str = Field(min_length=1, max_length=255)
    target_term: str = Field(min_length=1, max_length=255)
    note: str | None = None


class GlossaryEntryCreate(GlossaryEntryBase):
    pass


class GlossaryEntryUpdate(GlossaryEntryBase):
    pass


class GlossaryEntryRead(GlossaryEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
