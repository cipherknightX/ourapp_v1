from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SavedItemRead(BaseModel):
    id: UUID
    user_id: UUID
    connected_instagram_id: UUID | None = None
    platform: str = "instagram"
    source_url: str
    provider_item_id: str | None = None
    source_event_id: str | None = None
    caption: str | None = None
    creator_username: str | None = None
    thumbnail_url: str | None = None
    processing_status: str = "SAVED"
    raw_metadata: dict[str, object] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
