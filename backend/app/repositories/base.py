from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.schemas.instagram import ConnectedInstagramRead, PendingConnectionRead
from app.schemas.saved_item import SavedItemRead


class RepositoryProtocol(ABC):
    @abstractmethod
    def create_pending_connection(
        self,
        user_id: UUID,
        connection_code: str,
        expires_at: datetime,
        bot_username: str,
        dm_link: str,
    ) -> PendingConnectionRead:
        pass

    @abstractmethod
    def get_pending_connection_by_code(
        self, connection_code: str
    ) -> PendingConnectionRead | None:
        pass

    @abstractmethod
    def consume_pending_connection(self, connection_code: str) -> bool:
        pass

    @abstractmethod
    def upsert_connected_instagram(
        self,
        user_id: UUID,
        instagram_scoped_id: str,
        display_username: str | None = None,
    ) -> ConnectedInstagramRead:
        pass

    @abstractmethod
    def get_connected_instagram_by_scoped_id(
        self, instagram_scoped_id: str
    ) -> ConnectedInstagramRead | None:
        pass

    @abstractmethod
    def get_user_connections(self, user_id: UUID) -> list[ConnectedInstagramRead]:
        pass

    @abstractmethod
    def disconnect_instagram(self, user_id: UUID, connection_id: UUID) -> bool:
        pass

    @abstractmethod
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
        """Creates saved item if not exists for (user_id, source_event_id).

        Returns (SavedItemRead, is_newly_created).
        """
        pass

    @abstractmethod
    def get_saved_items_for_user(
        self, user_id: UUID, limit: int = 50
    ) -> list[SavedItemRead]:
        pass

    @abstractmethod
    def get_saved_item_by_id(
        self, user_id: UUID, saved_item_id: UUID
    ) -> SavedItemRead | None:
        """Retrieves a single saved item owned by user_id."""
        pass

    @abstractmethod
    def delete_saved_item(self, user_id: UUID, saved_item_id: UUID) -> bool:
        """Deletes a single saved item owned by user_id. Returns True if deleted."""
        pass
