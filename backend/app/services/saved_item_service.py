from uuid import UUID

from app.repositories.base import RepositoryProtocol
from app.schemas.saved_item import SavedItemRead


class SavedItemService:
    def __init__(self, repository: RepositoryProtocol) -> None:
        self._repo = repository

    def get_user_saved_items(
        self, user_id: UUID, limit: int = 50
    ) -> list[SavedItemRead]:
        return self._repo.get_saved_items_for_user(user_id=user_id, limit=limit)
