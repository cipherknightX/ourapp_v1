from datetime import UTC, datetime
from threading import Lock
from uuid import UUID, uuid4

from app.core.config import settings
from app.repositories.base import RepositoryProtocol
from app.repositories.supabase_repo import SupabaseRepository
from app.schemas.instagram import ConnectedInstagramRead, PendingConnectionRead
from app.schemas.saved_item import SavedItemRead


class InMemoryRepository(RepositoryProtocol):
    """In-memory repository used for isolated unit tests."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._pending_connections: dict[str, PendingConnectionRead] = {}
        self._consumed_codes: set[str] = set()
        self._connected_accounts: dict[UUID, ConnectedInstagramRead] = {}
        self._saved_items: dict[UUID, SavedItemRead] = {}

    def create_pending_connection(
        self,
        user_id: UUID,
        connection_code: str,
        expires_at: datetime,
        bot_username: str,
        dm_link: str,
    ) -> PendingConnectionRead:
        with self._lock:
            now = datetime.now(UTC)
            row_id = uuid4()
            item = PendingConnectionRead(
                id=row_id,
                user_id=user_id,
                connection_code=connection_code,
                bot_username=bot_username,
                dm_link=dm_link,
                expires_at=expires_at,
                created_at=now,
            )
            self._pending_connections[connection_code] = item
            return item

    def get_pending_connection_by_code(
        self, connection_code: str
    ) -> PendingConnectionRead | None:
        with self._lock:
            item = self._pending_connections.get(connection_code)
            if not item:
                return None
            if connection_code in self._consumed_codes:
                return None
            now = datetime.now(UTC)
            if item.expires_at < now:
                return None
            return item

    def consume_pending_connection(self, connection_code: str) -> bool:
        with self._lock:
            item = self._pending_connections.get(connection_code)
            if not item or connection_code in self._consumed_codes:
                return False
            self._consumed_codes.add(connection_code)
            return True

    def upsert_connected_instagram(
        self,
        user_id: UUID,
        instagram_scoped_id: str,
        display_username: str | None = None,
    ) -> ConnectedInstagramRead:
        with self._lock:
            now = datetime.now(UTC)
            for key, row in list(self._connected_accounts.items()):
                if (
                    row.user_id == user_id
                    and row.instagram_scoped_id == instagram_scoped_id
                ):
                    updated = ConnectedInstagramRead(
                        id=row.id,
                        user_id=row.user_id,
                        instagram_scoped_id=row.instagram_scoped_id,
                        display_username=display_username or row.display_username,
                        status="ACTIVE",
                        created_at=row.created_at,
                        updated_at=now,
                    )
                    self._connected_accounts[key] = updated
                    return updated

            row_id = uuid4()
            created = ConnectedInstagramRead(
                id=row_id,
                user_id=user_id,
                instagram_scoped_id=instagram_scoped_id,
                display_username=display_username,
                status="ACTIVE",
                created_at=now,
                updated_at=now,
            )
            self._connected_accounts[row_id] = created
            return created

    def get_connected_instagram_by_scoped_id(
        self, instagram_scoped_id: str
    ) -> ConnectedInstagramRead | None:
        with self._lock:
            for row in self._connected_accounts.values():
                if (
                    row.instagram_scoped_id == instagram_scoped_id
                    and row.status == "ACTIVE"
                ):
                    return row
            return None

    def get_user_connections(self, user_id: UUID) -> list[ConnectedInstagramRead]:
        with self._lock:
            results = [
                row
                for row in self._connected_accounts.values()
                if row.user_id == user_id and row.status == "ACTIVE"
            ]
            results.sort(key=lambda x: x.created_at, reverse=True)
            return results

    def disconnect_instagram(self, user_id: UUID, connection_id: UUID) -> bool:
        with self._lock:
            row = self._connected_accounts.get(connection_id)
            if not row or row.user_id != user_id:
                return False
            now = datetime.now(UTC)
            updated = ConnectedInstagramRead(
                id=row.id,
                user_id=row.user_id,
                instagram_scoped_id=row.instagram_scoped_id,
                display_username=row.display_username,
                status="DISCONNECTED",
                created_at=row.created_at,
                updated_at=now,
            )
            self._connected_accounts[connection_id] = updated
            return True

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
        with self._lock:
            now = datetime.now(UTC)
            if source_event_id:
                for row in self._saved_items.values():
                    if (
                        row.user_id == user_id
                        and row.source_event_id == source_event_id
                    ):
                        return row, False

            row_id = uuid4()
            item = SavedItemRead(
                id=row_id,
                user_id=user_id,
                connected_instagram_id=connected_instagram_id,
                platform=platform,
                source_url=source_url,
                provider_item_id=provider_item_id,
                source_event_id=source_event_id,
                caption=caption,
                creator_username=creator_username,
                thumbnail_url=thumbnail_url,
                processing_status="SAVED",
                raw_metadata=raw_metadata,
                created_at=now,
                updated_at=now,
            )
            self._saved_items[row_id] = item
            return item, True

    def get_saved_items_for_user(
        self, user_id: UUID, limit: int = 50
    ) -> list[SavedItemRead]:
        with self._lock:
            results = [
                row for row in self._saved_items.values() if row.user_id == user_id
            ]
            results.sort(key=lambda x: x.created_at, reverse=True)
            return results[:limit]

    def get_saved_item_by_id(
        self, user_id: UUID, saved_item_id: UUID
    ) -> SavedItemRead | None:
        with self._lock:
            item = self._saved_items.get(saved_item_id)
            if not item or item.user_id != user_id:
                return None
            return item

    def delete_saved_item(self, user_id: UUID, saved_item_id: UUID) -> bool:
        with self._lock:
            item = self._saved_items.get(saved_item_id)
            if not item or item.user_id != user_id:
                return False
            del self._saved_items[saved_item_id]
            return True


_default_repository: RepositoryProtocol | None = None


def get_repository() -> RepositoryProtocol:
    global _default_repository
    if _default_repository is None:
        if settings.SUPABASE_URL:
            _default_repository = SupabaseRepository()
        else:
            _default_repository = InMemoryRepository()
    return _default_repository


def set_repository(repo: RepositoryProtocol | None) -> None:
    global _default_repository
    _default_repository = repo
