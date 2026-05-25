from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


TranslationJobStatus = Literal["pending", "running", "succeeded", "failed", "cancelled"]


class TranslationJobRead(BaseModel):
    id: int
    book_id: int | None
    chapter_id: int | None
    status: TranslationJobStatus
    total_items: int
    completed_items: int
    current_item_label: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
