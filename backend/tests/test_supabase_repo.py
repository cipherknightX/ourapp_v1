from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx
from httpx import Response

from app.repositories.supabase_repo import SupabaseRepository


def test_supabase_repo_create_pending_connection() -> None:
    user_id = uuid4()
    row_id = uuid4()
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=15)

    def handler(request: httpx.Request) -> Response:
        assert request.method == "POST"
        assert "/pending_instagram_connections" in str(request.url)
        return Response(
            201,
            json=[
                {
                    "id": str(row_id),
                    "user_id": str(user_id),
                    "connection_code": "CONNECT-ABC123",
                    "expires_at": expires.isoformat(),
                    "created_at": now.isoformat(),
                }
            ],
        )

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport, base_url="http://test/rest/v1")
    repo = SupabaseRepository(client=client)

    result = repo.create_pending_connection(
        user_id=user_id,
        connection_code="CONNECT-ABC123",
        expires_at=expires,
        bot_username="save.this.for.me",
        dm_link="https://ig.me/m/save.this.for.me?text=CONNECT-ABC123",
    )

    assert result.id == row_id
    assert result.user_id == user_id
    assert result.connection_code == "CONNECT-ABC123"
    assert result.bot_username == "save.this.for.me"


def test_supabase_repo_get_and_consume_pending_connection() -> None:
    user_id = uuid4()
    row_id = uuid4()
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=15)

    def handler(request: httpx.Request) -> Response:
        if request.method == "GET":
            return Response(
                200,
                json=[
                    {
                        "id": str(row_id),
                        "user_id": str(user_id),
                        "connection_code": "CONNECT-TEST",
                        "expires_at": expires.isoformat(),
                        "created_at": now.isoformat(),
                    }
                ],
            )
        if request.method == "PATCH":
            return Response(
                200,
                json=[
                    {
                        "id": str(row_id),
                        "consumed_at": now.isoformat(),
                    }
                ],
            )
        return Response(404)

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport, base_url="http://test/rest/v1")
    repo = SupabaseRepository(client=client)

    pending = repo.get_pending_connection_by_code("CONNECT-TEST")
    assert pending is not None
    assert pending.connection_code == "CONNECT-TEST"

    consumed = repo.consume_pending_connection("CONNECT-TEST")
    assert consumed is True


def test_supabase_repo_upsert_and_get_connected_instagram() -> None:
    user_id = uuid4()
    conn_id = uuid4()
    now = datetime.now(UTC)

    def handler(request: httpx.Request) -> Response:
        url_str = str(request.url)
        if request.method == "GET" and "status=eq.ACTIVE" in url_str:
            return Response(
                200,
                json=[
                    {
                        "id": str(conn_id),
                        "user_id": str(user_id),
                        "instagram_scoped_id": "ig_scoped_123",
                        "display_username": "photographer",
                        "status": "ACTIVE",
                        "created_at": now.isoformat(),
                        "updated_at": now.isoformat(),
                    }
                ],
            )
        if request.method == "GET":
            # Check existing (empty for new insert)
            return Response(200, json=[])
        if request.method == "POST":
            return Response(
                201,
                json=[
                    {
                        "id": str(conn_id),
                        "user_id": str(user_id),
                        "instagram_scoped_id": "ig_scoped_123",
                        "display_username": "photographer",
                        "status": "ACTIVE",
                        "created_at": now.isoformat(),
                        "updated_at": now.isoformat(),
                    }
                ],
            )
        return Response(404)

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport, base_url="http://test/rest/v1")
    repo = SupabaseRepository(client=client)

    created = repo.upsert_connected_instagram(
        user_id=user_id,
        instagram_scoped_id="ig_scoped_123",
        display_username="photographer",
    )
    assert created.id == conn_id
    assert created.status == "ACTIVE"

    found = repo.get_connected_instagram_by_scoped_id("ig_scoped_123")
    assert found is not None
    assert found.instagram_scoped_id == "ig_scoped_123"


def test_supabase_repo_disconnect_instagram() -> None:
    user_id = uuid4()
    conn_id = uuid4()

    def handler(request: httpx.Request) -> Response:
        if request.method == "PATCH":
            return Response(
                200,
                json=[
                    {
                        "id": str(conn_id),
                        "status": "DISCONNECTED",
                    }
                ],
            )
        return Response(404)

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport, base_url="http://test/rest/v1")
    repo = SupabaseRepository(client=client)

    result = repo.disconnect_instagram(user_id=user_id, connection_id=conn_id)
    assert result is True


def test_supabase_repo_create_saved_item_idempotent() -> None:
    user_id = uuid4()
    item_id = uuid4()
    now = datetime.now(UTC)

    has_item = False

    def handler(request: httpx.Request) -> Response:
        nonlocal has_item
        if request.method == "GET":
            if has_item:
                return Response(
                    200,
                    json=[
                        {
                            "id": str(item_id),
                            "user_id": str(user_id),
                            "connected_instagram_id": None,
                            "platform": "instagram",
                            "source_url": "https://instagram.com/reel/123/",
                            "provider_item_id": "123",
                            "source_event_id": "mid_unique_1",
                            "caption": "Reel Caption",
                            "creator_username": None,
                            "thumbnail_url": None,
                            "processing_status": "SAVED",
                            "raw_metadata": {},
                            "created_at": now.isoformat(),
                            "updated_at": now.isoformat(),
                        }
                    ],
                )
            return Response(200, json=[])
        if request.method == "POST":
            has_item = True
            return Response(
                201,
                json=[
                    {
                        "id": str(item_id),
                        "user_id": str(user_id),
                        "connected_instagram_id": None,
                        "platform": "instagram",
                        "source_url": "https://instagram.com/reel/123/",
                        "provider_item_id": "123",
                        "source_event_id": "mid_unique_1",
                        "caption": "Reel Caption",
                        "creator_username": None,
                        "thumbnail_url": None,
                        "processing_status": "SAVED",
                        "raw_metadata": {},
                        "created_at": now.isoformat(),
                        "updated_at": now.isoformat(),
                    }
                ],
            )
        return Response(404)

    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport, base_url="http://test/rest/v1")
    repo = SupabaseRepository(client=client)

    # First save
    item1, is_new1 = repo.create_saved_item_idempotent(
        user_id=user_id,
        connected_instagram_id=None,
        platform="instagram",
        source_url="https://instagram.com/reel/123/",
        provider_item_id="123",
        source_event_id="mid_unique_1",
        caption="Reel Caption",
        creator_username=None,
        thumbnail_url=None,
        raw_metadata={},
    )
    assert is_new1 is True
    assert item1.id == item_id

    # Duplicate save with same source_event_id
    item2, is_new2 = repo.create_saved_item_idempotent(
        user_id=user_id,
        connected_instagram_id=None,
        platform="instagram",
        source_url="https://instagram.com/reel/123/",
        provider_item_id="123",
        source_event_id="mid_unique_1",
        caption="Reel Caption",
        creator_username=None,
        thumbnail_url=None,
        raw_metadata={},
    )
    assert is_new2 is False
    assert item2.id == item_id
