from collections.abc import Generator
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import get_current_user
from app.integrations.instagram.client import (
    InstagramClient,
    get_instagram_client,
)
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


@pytest.mark.asyncio
async def test_delete_saved_item_owner_success(repo: InMemoryRepository) -> None:
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

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        delete_res = await client.delete(f"/api/v1/saved-items/{item_a.id}")
        assert delete_res.status_code == 204

        # Verify item is gone
        list_res = await client.get("/api/v1/saved-items")
        assert list_res.status_code == 200
        assert len(list_res.json()) == 0

        # Repeated delete returns 404
        repeat_res = await client.delete(f"/api/v1/saved-items/{item_a.id}")
        assert repeat_res.status_code == 404


@pytest.mark.asyncio
async def test_delete_saved_item_non_owner_forbidden(
    repo: InMemoryRepository,
) -> None:
    # Item owned by User B
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
        # User A attempts to delete User B's item
        delete_res = await client.delete(f"/api/v1/saved-items/{item_b.id}")
        assert delete_res.status_code == 404

    # Verify item still exists in storage
    assert (
        repo.get_saved_item_by_id(user_id=_user_b, saved_item_id=item_b.id) is not None
    )


@pytest.mark.asyncio
async def test_send_to_me_owner_success(repo: InMemoryRepository) -> None:
    conn = repo.upsert_connected_instagram(
        user_id=_user_a,
        instagram_scoped_id="ig_alice_scoped_123",
        display_username="alice_ig",
    )

    item_a, _ = repo.create_saved_item_idempotent(
        user_id=_user_a,
        connected_instagram_id=conn.id,
        platform="instagram",
        source_url="https://www.instagram.com/reel/AliceReel123/",
        provider_item_id="AliceReel123",
        source_event_id="mid_a",
        caption="Pasta reel",
        creator_username=None,
        thumbnail_url=None,
        raw_metadata={},
    )

    mock_client = MagicMock(spec=InstagramClient)
    mock_client.send_text_message.return_value = {
        "recipient_id": "ig_alice_scoped_123",
        "message_id": "mid_out",
    }
    app.dependency_overrides[get_instagram_client] = lambda: mock_client

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(f"/api/v1/saved-items/{item_a.id}/send-to-me")

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "sent"

        mock_client.send_text_message.assert_called_once_with(
            recipient_id="ig_alice_scoped_123",
            text="Here's something you saved:\nhttps://www.instagram.com/reel/AliceReel123/",
        )
    finally:
        app.dependency_overrides.pop(get_instagram_client, None)


@pytest.mark.asyncio
async def test_send_to_me_no_connected_account(repo: InMemoryRepository) -> None:
    item_a, _ = repo.create_saved_item_idempotent(
        user_id=_user_a,
        connected_instagram_id=None,
        platform="instagram",
        source_url="https://www.instagram.com/reel/AliceReel123/",
        provider_item_id="AliceReel123",
        source_event_id="mid_a",
        caption="Pasta reel",
        creator_username=None,
        thumbnail_url=None,
        raw_metadata={},
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(f"/api/v1/saved-items/{item_a.id}/send-to-me")

    assert res.status_code == 400
    assert "No active connected Instagram account" in res.json()["detail"]
