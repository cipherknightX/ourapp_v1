from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.repositories.base import RepositoryProtocol
from app.repositories.store import get_repository
from app.schemas.instagram import ConnectedInstagramRead, PendingConnectionRead
from app.schemas.user import UserContext
from app.services.instagram_service import InstagramService

router = APIRouter(prefix="/instagram", tags=["instagram"])


def get_instagram_service(
    repository: Annotated[RepositoryProtocol, Depends(get_repository)],
) -> InstagramService:
    return InstagramService(repository)


@router.post("/connections/pending", response_model=PendingConnectionRead)
async def create_pending_connection(
    current_user: Annotated[UserContext, Depends(get_current_user)],
    instagram_service: Annotated[InstagramService, Depends(get_instagram_service)],
) -> PendingConnectionRead:
    """Generate a temporary pairing code to connect an Instagram account."""
    return instagram_service.create_pending_connection(user_id=current_user.user_id)


@router.get("/connections", response_model=list[ConnectedInstagramRead])
async def list_connected_accounts(
    current_user: Annotated[UserContext, Depends(get_current_user)],
    instagram_service: Annotated[InstagramService, Depends(get_instagram_service)],
) -> list[ConnectedInstagramRead]:
    """List connected Instagram accounts for the authenticated user."""
    return instagram_service.get_user_connections(user_id=current_user.user_id)


@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_account(
    connection_id: UUID,
    current_user: Annotated[UserContext, Depends(get_current_user)],
    instagram_service: Annotated[InstagramService, Depends(get_instagram_service)],
) -> None:
    """Disconnect an Instagram account."""
    success = instagram_service.disconnect_account(
        user_id=current_user.user_id,
        connection_id=connection_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found or already disconnected",
        )
