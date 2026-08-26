from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.schemas.user import UserContext, UserRead

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/me", response_model=UserRead)
async def get_me(
    current_user: UserContext = Depends(get_current_user),
) -> UserRead:
    return UserRead(
        id=current_user.user_id,
        email=current_user.email,
    )
