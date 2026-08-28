from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.auth import get_current_user
from app.integrations.instagram.client import (
    InstagramClient,
    get_instagram_client,
)
from app.repositories.base import RepositoryProtocol
from app.repositories.store import get_repository
from app.schemas.saved_item import SavedItemRead
from app.schemas.user import UserContext
from app.services.saved_item_service import (
    SavedItemNotFoundError,
    SavedItemService,
    SavedItemServiceError,
)

router = APIRouter(prefix="/saved-items", tags=["saved-items"])


def get_saved_item_service(
    repository: Annotated[RepositoryProtocol, Depends(get_repository)],
    instagram_client: Annotated[InstagramClient, Depends(get_instagram_client)],
) -> SavedItemService:
    return SavedItemService(repository, instagram_client)


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


@router.delete("/{saved_item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_item(
    saved_item_id: UUID,
    current_user: Annotated[UserContext, Depends(get_current_user)],
    saved_item_service: Annotated[SavedItemService, Depends(get_saved_item_service)],
) -> Response:
    """Deletes a saved item belonging to the authenticated user."""
    deleted = saved_item_service.delete_user_saved_item(
        user_id=current_user.user_id, saved_item_id=saved_item_id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved item not found or not owned by user",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{saved_item_id}/send-to-me")
async def send_saved_item_to_me(
    saved_item_id: UUID,
    current_user: Annotated[UserContext, Depends(get_current_user)],
    saved_item_service: Annotated[SavedItemService, Depends(get_saved_item_service)],
) -> dict[str, object]:
    """Sends a saved item back to the owner's active Instagram account via DM."""
    try:
        return saved_item_service.send_saved_item_to_user(
            user_id=current_user.user_id, saved_item_id=saved_item_id
        )
    except SavedItemNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc
    except SavedItemServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        ) from exc
