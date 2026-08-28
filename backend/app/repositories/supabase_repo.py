import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import httpx

from app.core.config import settings
from app.repositories.base import RepositoryProtocol
from app.schemas.instagram import ConnectedInstagramRead, PendingConnectionRead
from app.schemas.saved_item import SavedItemRead

logger = logging.getLogger(__name__)


class SupabaseRepository(RepositoryProtocol):
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self._supabase_url = (base_url or settings.SUPABASE_URL).rstrip("/")
        self._api_key = api_key or settings.database_key
        self._rest_url = f"{self._supabase_url}/rest/v1"

        if client is not None:
            self._client = client
        else:
            headers: dict[str, str] = {
                "apikey": self._api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            # Attach Authorization Bearer only if key is a legacy JWT (starts with 'ey')
            if self._api_key.startswith("ey"):
                headers["Authorization"] = f"Bearer {self._api_key}"

            self._client = httpx.Client(
                base_url=self._rest_url,
                headers=headers,
                timeout=10.0,
            )

    def create_pending_connection(
        self,
        user_id: UUID,
        connection_code: str,
        expires_at: datetime,
        bot_username: str,
        dm_link: str,
    ) -> PendingConnectionRead:
        row_id = uuid4()
        now = datetime.now(UTC)
        payload = {
            "id": str(row_id),
            "user_id": str(user_id),
            "connection_code": connection_code,
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat(),
        }

        response = self._client.post(
            "/pending_instagram_connections",
            json=payload,
            headers={"Prefer": "return=representation"},
        )
        response.raise_for_status()
        rows = response.json()
        row = rows[0] if isinstance(rows, list) and rows else payload

        return PendingConnectionRead(
            id=UUID(row["id"]),
            user_id=UUID(row["user_id"]),
            connection_code=row["connection_code"],
            bot_username=bot_username,
            dm_link=dm_link,
            expires_at=datetime.fromisoformat(row["expires_at"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def get_pending_connection_by_code(
        self, connection_code: str
    ) -> PendingConnectionRead | None:
        response = self._client.get(
            "/pending_instagram_connections",
            params={
                "connection_code": f"eq.{connection_code}",
                "consumed_at": "is.null",
                "select": "*",
            },
        )
        response.raise_for_status()
        rows = response.json()
        if not rows or not isinstance(rows, list):
            return None

        row = rows[0]
        expires_at = datetime.fromisoformat(row["expires_at"])
        if expires_at < datetime.now(UTC):
            return None

        bot_username = settings.INSTAGRAM_BOT_USERNAME or "save.this.for.me"
        dm_link = f"https://ig.me/m/{bot_username}?text={connection_code}"

        return PendingConnectionRead(
            id=UUID(row["id"]),
            user_id=UUID(row["user_id"]),
            connection_code=row["connection_code"],
            bot_username=bot_username,
            dm_link=dm_link,
            expires_at=expires_at,
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def consume_pending_connection(self, connection_code: str) -> bool:
        now = datetime.now(UTC)
        response = self._client.patch(
            "/pending_instagram_connections",
            params={
                "connection_code": f"eq.{connection_code}",
                "consumed_at": "is.null",
            },
            json={"consumed_at": now.isoformat()},
            headers={"Prefer": "return=representation"},
        )
        response.raise_for_status()
        rows = response.json()
        return bool(rows and isinstance(rows, list))

    def upsert_connected_instagram(
        self,
        user_id: UUID,
        instagram_scoped_id: str,
        display_username: str | None = None,
    ) -> ConnectedInstagramRead:
        now = datetime.now(UTC)
        # Check if row exists for user_id + instagram_scoped_id
        check_res = self._client.get(
            "/connected_instagram",
            params={
                "user_id": f"eq.{user_id}",
                "instagram_scoped_id": f"eq.{instagram_scoped_id}",
                "select": "*",
            },
        )
        check_res.raise_for_status()
        existing = check_res.json()

        if existing and isinstance(existing, list) and len(existing) > 0:
            row_id = existing[0]["id"]
            update_payload = {
                "status": "ACTIVE",
                "display_username": display_username
                or existing[0].get("display_username"),
                "updated_at": now.isoformat(),
            }
            update_res = self._client.patch(
                "/connected_instagram",
                params={"id": f"eq.{row_id}"},
                json=update_payload,
                headers={"Prefer": "return=representation"},
            )
            update_res.raise_for_status()
            row = update_res.json()[0]
        else:
            insert_payload = {
                "id": str(uuid4()),
                "user_id": str(user_id),
                "instagram_scoped_id": instagram_scoped_id,
                "display_username": display_username,
                "status": "ACTIVE",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            insert_res = self._client.post(
                "/connected_instagram",
                json=insert_payload,
                headers={"Prefer": "return=representation"},
            )
            insert_res.raise_for_status()
            row = insert_res.json()[0]

        return ConnectedInstagramRead(
            id=UUID(row["id"]),
            user_id=UUID(row["user_id"]),
            instagram_scoped_id=row["instagram_scoped_id"],
            display_username=row.get("display_username"),
            status=row["status"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    def get_connected_instagram_by_scoped_id(
        self, instagram_scoped_id: str
    ) -> ConnectedInstagramRead | None:
        response = self._client.get(
            "/connected_instagram",
            params={
                "instagram_scoped_id": f"eq.{instagram_scoped_id}",
                "status": "eq.ACTIVE",
                "select": "*",
            },
        )
        response.raise_for_status()
        rows = response.json()
        if not rows or not isinstance(rows, list):
            return None

        row = rows[0]
        return ConnectedInstagramRead(
            id=UUID(row["id"]),
            user_id=UUID(row["user_id"]),
            instagram_scoped_id=row["instagram_scoped_id"],
            display_username=row.get("display_username"),
            status=row["status"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    def get_user_connections(self, user_id: UUID) -> list[ConnectedInstagramRead]:
        response = self._client.get(
            "/connected_instagram",
            params={
                "user_id": f"eq.{user_id}",
                "status": "eq.ACTIVE",
                "order": "created_at.desc",
                "select": "*",
            },
        )
        response.raise_for_status()
        rows = response.json()
        if not rows or not isinstance(rows, list):
            return []

        return [
            ConnectedInstagramRead(
                id=UUID(r["id"]),
                user_id=UUID(r["user_id"]),
                instagram_scoped_id=r["instagram_scoped_id"],
                display_username=r.get("display_username"),
                status=r["status"],
                created_at=datetime.fromisoformat(r["created_at"]),
                updated_at=datetime.fromisoformat(r["updated_at"]),
            )
            for r in rows
        ]

    def disconnect_instagram(self, user_id: UUID, connection_id: UUID) -> bool:
        now = datetime.now(UTC)
        response = self._client.patch(
            "/connected_instagram",
            params={
                "id": f"eq.{connection_id}",
                "user_id": f"eq.{user_id}",
                "status": "eq.ACTIVE",
            },
            json={
                "status": "DISCONNECTED",
                "updated_at": now.isoformat(),
            },
            headers={"Prefer": "return=representation"},
        )
        response.raise_for_status()
        rows = response.json()
        return bool(rows and isinstance(rows, list))

    def create_saved_item_idempotent(
        self,
        user_id: UUID,
        connected_instagram_id: UUID | None,
        platform: str,
        source_url: str,
        provider_item_id: str | None,
        source_event_id: str | None,
        caption: str | None,
        creator_username: str | None,
        thumbnail_url: str | None,
        raw_metadata: dict[str, object],
    ) -> tuple[SavedItemRead, bool]:
        # Check if already exists for this (user_id, source_event_id)
        if source_event_id:
            check_res = self._client.get(
                "/saved_items",
                params={
                    "user_id": f"eq.{user_id}",
                    "source_event_id": f"eq.{source_event_id}",
                    "select": "*",
                },
            )
            check_res.raise_for_status()
            existing = check_res.json()
            if existing and isinstance(existing, list) and len(existing) > 0:
                row = existing[0]
                return (
                    SavedItemRead(
                        id=UUID(row["id"]),
                        user_id=UUID(row["user_id"]),
                        connected_instagram_id=(
                            UUID(row["connected_instagram_id"])
                            if row.get("connected_instagram_id")
                            else None
                        ),
                        platform=row["platform"],
                        source_url=row["source_url"],
                        provider_item_id=row.get("provider_item_id"),
                        source_event_id=row.get("source_event_id"),
                        caption=row.get("caption"),
                        creator_username=row.get("creator_username"),
                        thumbnail_url=row.get("thumbnail_url"),
                        processing_status=row["processing_status"],
                        raw_metadata=row.get("raw_metadata") or {},
                        created_at=datetime.fromisoformat(row["created_at"]),
                        updated_at=datetime.fromisoformat(row["updated_at"]),
                    ),
                    False,
                )

        now = datetime.now(UTC)
        row_id = uuid4()
        payload: dict[str, Any] = {
            "id": str(row_id),
            "user_id": str(user_id),
            "connected_instagram_id": (
                str(connected_instagram_id) if connected_instagram_id else None
            ),
            "platform": platform,
            "source_url": source_url,
            "provider_item_id": provider_item_id,
            "source_event_id": source_event_id,
            "caption": caption,
            "creator_username": creator_username,
            "thumbnail_url": thumbnail_url,
            "processing_status": "SAVED",
            "raw_metadata": raw_metadata,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        response = self._client.post(
            "/saved_items",
            json=payload,
            headers={"Prefer": "return=representation,resolution=ignore-duplicates"},
        )
        response.raise_for_status()
        rows = response.json()
        row = rows[0] if isinstance(rows, list) and rows else payload

        return (
            SavedItemRead(
                id=UUID(row["id"]),
                user_id=UUID(row["user_id"]),
                connected_instagram_id=(
                    UUID(row["connected_instagram_id"])
                    if row.get("connected_instagram_id")
                    else None
                ),
                platform=row["platform"],
                source_url=row["source_url"],
                provider_item_id=row.get("provider_item_id"),
                source_event_id=row.get("source_event_id"),
                caption=row.get("caption"),
                creator_username=row.get("creator_username"),
                thumbnail_url=row.get("thumbnail_url"),
                processing_status=row["processing_status"],
                raw_metadata=row.get("raw_metadata") or {},
                created_at=datetime.fromisoformat(row["created_at"]),
                updated_at=datetime.fromisoformat(row["updated_at"]),
            ),
            True,
        )

    def get_saved_items_for_user(
        self, user_id: UUID, limit: int = 50
    ) -> list[SavedItemRead]:
        response = self._client.get(
            "/saved_items",
            params={
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": str(limit),
                "select": "*",
            },
        )
        response.raise_for_status()
        rows = response.json()
        if not rows or not isinstance(rows, list):
            return []

        return [
            SavedItemRead(
                id=UUID(r["id"]),
                user_id=UUID(r["user_id"]),
                connected_instagram_id=(
                    UUID(r["connected_instagram_id"])
                    if r.get("connected_instagram_id")
                    else None
                ),
                platform=r["platform"],
                source_url=r["source_url"],
                provider_item_id=r.get("provider_item_id"),
                source_event_id=r.get("source_event_id"),
                caption=r.get("caption"),
                creator_username=r.get("creator_username"),
                thumbnail_url=r.get("thumbnail_url"),
                processing_status=r["processing_status"],
                raw_metadata=r.get("raw_metadata") or {},
                created_at=datetime.fromisoformat(r["created_at"]),
                updated_at=datetime.fromisoformat(r["updated_at"]),
            )
            for r in rows
        ]
