from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.auth import get_current_user
from app.repositories.base import RepositoryProtocol
from app.repositories.store import get_repository
from app.schemas.saved_item import SavedItemRead
from app.schemas.user import UserContext
from app.services.saved_item_service import SavedItemService

router = APIRouter(prefix="/saved-items", tags=["saved-items"])


def get_saved_item_service(
    repository: Annotated[RepositoryProtocol, Depends(get_repository)],
) -> SavedItemService:
    return SavedItemService(repository)


@router.get("", response_model=list[SavedItemRead])
async def list_saved_items(
    current_user: Annotated[UserContext, Depends(get_current_user)],
    saved_item_service: Annotated[SavedItemService, Depends(get_saved_item_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[SavedItemRead]:
    """List saved items belonging to the authenticated user."""
    return saved_item_service.get_user_saved_items(
        user_id=current_user.user_id, limit=limit
    )
