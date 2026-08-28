from collections.abc import Generator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import get_current_user
from app.main import app
from app.repositories.store import InMemoryRepository, get_repository
from app.schemas.user import UserContext

_test_user_id = uuid4()
_other_user_id = uuid4()


@pytest.fixture
def repo() -> Generator[InMemoryRepository, None, None]:
    test_repo = InMemoryRepository()
    app.dependency_overrides[get_repository] = lambda: test_repo
    app.dependency_overrides[get_current_user] = lambda: UserContext(
        user_id=_test_user_id,
        email="user@example.com",
    )
    yield test_repo
    app.dependency_overrides.pop(get_repository, None)
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_create_pending_connection(repo: InMemoryRepository) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/instagram/connections/pending")

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(_test_user_id)
    assert data["connection_code"].startswith("CONNECT-")
    assert "ig.me" in data["dm_link"]


@pytest.mark.asyncio
async def test_list_and_disconnect_account(repo: InMemoryRepository) -> None:
    # Pre-populate connection for test user
    conn1 = repo.upsert_connected_instagram(
        user_id=_test_user_id,
        instagram_scoped_id="ig_123",
        display_username="alice_test",
    )
    # Pre-populate connection for another user
    conn_other = repo.upsert_connected_instagram(
        user_id=_other_user_id,
        instagram_scoped_id="ig_other",
        display_username="bob_test",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # List connections -> only test user's accounts returned
        list_res = await client.get("/api/v1/instagram/connections")
        assert list_res.status_code == 200
        connections = list_res.json()
        assert len(connections) == 1
        assert connections[0]["id"] == str(conn1.id)

        # Attempt to disconnect other user's account -> 404 forbidden
        del_other_res = await client.delete(
            f"/api/v1/instagram/connections/{conn_other.id}"
        )
        assert del_other_res.status_code == 404

        # Disconnect own account -> 204 No Content
        del_own_res = await client.delete(f"/api/v1/instagram/connections/{conn1.id}")
        assert del_own_res.status_code == 204

        # Verify account no longer listed
        list_after_res = await client.get("/api/v1/instagram/connections")
        assert list_after_res.status_code == 200
        assert len(list_after_res.json()) == 0


@pytest.mark.asyncio
async def test_unauthenticated_connection_endpoints() -> None:
    # Ensure no auth override
    app.dependency_overrides.pop(get_current_user, None)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res1 = await client.post("/api/v1/instagram/connections/pending")
        res2 = await client.get("/api/v1/instagram/connections")

    assert res1.status_code == 401
    assert res2.status_code == 401
