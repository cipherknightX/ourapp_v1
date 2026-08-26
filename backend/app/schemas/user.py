from uuid import UUID

from pydantic import BaseModel


class UserContext(BaseModel):
    user_id: UUID
    email: str | None = None
    role: str | None = None


class UserRead(BaseModel):
    id: UUID
    email: str | None = None
