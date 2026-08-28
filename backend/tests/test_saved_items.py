from collections.abc import Generator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import get_current_user
from app.main import app
from app.repositories.store import InMemoryRepository, get_repository
from app.schemas.user import UserContext

_user_a = uuid4()
_user_b = uuid4()


@pytest.fixture
def repo() -> Generator[InMemoryRepository, None, None]:
    test_repo = InMemoryRepository()
    app.dependency_overrides[get_repository] = lambda: test_repo
    app.dependency_overrides[get_current_user] = lambda: UserContext(
        user_id=_user_a,
        email="alice@example.com",
    )
    yield test_repo
    app.dependency_overrides.pop(get_repository, None)
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_list_saved_items_user_isolation(repo: InMemoryRepository) -> None:
    # Save item for user A
    item_a, _ = repo.create_saved_item_idempotent(
        user_id=_user_a,
        connected_instagram_id=None,
        platform="instagram",
        source_url="https://www.instagram.com/reel/AliceReel/",
        provider_item_id="AliceReel",
        source_event_id="mid_a",
        caption="Alice saved reel",
        creator_username=None,
        thumbnail_url=None,
        raw_metadata={},
    )

    # Save item for user B
    item_b, _ = repo.create_saved_item_idempotent(
        user_id=_user_b,
        connected_instagram_id=None,
        platform="instagram",
        source_url="https://www.instagram.com/reel/BobReel/",
        provider_item_id="BobReel",
        source_event_id="mid_b",
        caption="Bob saved reel",
        creator_username=None,
        thumbnail_url=None,
        raw_metadata={},
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/saved-items")

    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == str(item_a.id)
    assert items[0]["source_url"] == "https://www.instagram.com/reel/AliceReel/"
    assert items[0]["caption"] == "Alice saved reel"
    # User B's item is NOT accessible to User A
    assert not any(i["id"] == str(item_b.id) for i in items)


@pytest.mark.asyncio
async def test_saved_items_unauthenticated() -> None:
    app.dependency_overrides.pop(get_current_user, None)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/saved-items")

    assert response.status_code == 401
