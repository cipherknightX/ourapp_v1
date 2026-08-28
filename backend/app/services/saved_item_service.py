import logging
from typing import Any
from uuid import UUID

from app.integrations.instagram.client import (
    InstagramClient,
    get_instagram_client,
)
from app.repositories.base import RepositoryProtocol
from app.schemas.saved_item import SavedItemRead
from app.services.instagram_service import is_canonical_instagram_url

logger = logging.getLogger(__name__)


class SavedItemServiceError(Exception):
    """Base exception for SavedItemService errors."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class SavedItemNotFoundError(SavedItemServiceError):
    def __init__(self, message: str = "Saved item not found") -> None:
        super().__init__(message, status_code=404)


class SavedItemService:
    def __init__(
        self,
        repository: RepositoryProtocol,
        instagram_client: InstagramClient | None = None,
    ) -> None:
        self._repo = repository
        self._ig_client = instagram_client or get_instagram_client()

    def get_user_saved_items(
        self, user_id: UUID, limit: int = 50
    ) -> list[SavedItemRead]:
        return self._repo.get_saved_items_for_user(user_id=user_id, limit=limit)

    def delete_user_saved_item(self, user_id: UUID, saved_item_id: UUID) -> bool:
        """Deletes a saved item owned by user_id."""
        return self._repo.delete_saved_item(
            user_id=user_id, saved_item_id=saved_item_id
        )

    def send_saved_item_to_user(
        self, user_id: UUID, saved_item_id: UUID
    ) -> dict[str, Any]:
        """Sends a saved item back to the owner's active Instagram account via DM."""
        saved_item = self._repo.get_saved_item_by_id(
            user_id=user_id, saved_item_id=saved_item_id
        )
        if not saved_item:
            raise SavedItemNotFoundError("Saved item not found or not owned by user")

        if not is_canonical_instagram_url(saved_item.source_url):
            raise SavedItemServiceError(
                "Saved item does not have a canonical Instagram source URL",
                status_code=400,
            )

        connections = self._repo.get_user_connections(user_id=user_id)
        if not connections:
            raise SavedItemServiceError(
                "No active connected Instagram account found for this user",
                status_code=400,
            )

        # Match specific connected account if recorded, otherwise use active connection
        target_connection = None
        if saved_item.connected_instagram_id:
            for conn in connections:
                if conn.id == saved_item.connected_instagram_id:
                    target_connection = conn
                    break

        if not target_connection:
            target_connection = connections[0]

        message_text = f"Here's something you saved:\n{saved_item.source_url}"

        try:
            self._ig_client.send_text_message(
                recipient_id=target_connection.instagram_scoped_id,
                text=message_text,
            )
        except Exception as exc:
            logger.warning(
                "Failed to send saved item %s to recipient: %s",
                saved_item_id,
                exc,
            )
            raise SavedItemServiceError(
                f"Failed to send Instagram DM: {exc}", status_code=502
            ) from exc

        return {
            "status": "sent",
            "message": "Saved item sent to your Instagram DM",
            "saved_item_id": str(saved_item.id),
        }
