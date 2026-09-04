from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PendingConnectionCreate(BaseModel):
    pass


class PendingConnectionRead(BaseModel):
    id: UUID
    user_id: UUID
    connection_code: str
    bot_username: str
    dm_link: str
    expires_at: datetime
    created_at: datetime


class ConnectedInstagramRead(BaseModel):
    id: UUID
    user_id: UUID
    instagram_scoped_id: str
    display_username: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class NormalizedInstagramEvent(BaseModel):
    provider_event_id: str
    sender_id: str
    recipient_id: str
    timestamp: int
    message_id: str
    text: str | None = None
    attachments: list[dict[str, object]] = Field(default_factory=list)
    raw_payload: dict[str, object] = Field(default_factory=dict)
