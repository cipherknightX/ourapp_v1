import hashlib
import hmac
import json
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.repositories.store import InMemoryRepository, get_repository


@pytest.fixture(autouse=True)
def configure_test_repo(monkeypatch: pytest.MonkeyPatch) -> InMemoryRepository:
    test_repo = InMemoryRepository()
    app.dependency_overrides[get_repository] = lambda: test_repo
    monkeypatch.setattr(settings, "INSTAGRAM_VERIFY_TOKEN", "test_verify_token_123")
    monkeypatch.setattr(settings, "INSTAGRAM_APP_SECRET", "test_secret_xyz")
    return test_repo


def sign_payload(body: bytes, secret: str = "test_secret_xyz") -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


@pytest.mark.asyncio
async def test_webhook_verification_success() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/webhooks/instagram",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "test_verify_token_123",
                "hub.challenge": "1158201444",
            },
        )

    assert response.status_code == 200
    assert response.text == "1158201444"


@pytest.mark.asyncio
async def test_webhook_verification_invalid_token() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/webhooks/instagram",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "wrong_token",
                "hub.challenge": "1158201444",
            },
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_webhook_verification_missing_params() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/webhooks/instagram",
            params={"hub.mode": "subscribe"},
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_webhook_post_invalid_signature() -> None:
    body = b'{"object": "instagram", "entry": []}'
    headers = {"X-Hub-Signature-256": "sha256=invalid_signature_hex"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/webhooks/instagram",
            content=body,
            headers=headers,
        )

    assert response.status_code == 403
    assert "Invalid webhook signature" in response.json()["detail"]


@pytest.mark.asyncio
async def test_webhook_pairing_handshake_flow(
    configure_test_repo: InMemoryRepository,
) -> None:
    user_id = uuid4()
    # 1. User requested pairing code
    from app.services.instagram_service import InstagramService

    svc = InstagramService(configure_test_repo)
    pending = svc.create_pending_connection(user_id)
    pairing_code = pending.connection_code

    # 2. Instagram sends webhook with user DMing the pairing code
    sender_id = "ig_sender_12345"
    payload = {
        "object": "instagram",
        "entry": [
            {
                "id": "bot_page_id",
                "time": 1718000000,
                "messaging": [
                    {
                        "sender": {"id": sender_id},
                        "recipient": {"id": "bot_page_id"},
                        "timestamp": 1718000000000,
                        "message": {
                            "mid": "m_mid_handshake_1",
                            "text": pairing_code,
                        },
                    }
                ],
            }
        ],
    }

    body = json.dumps(payload).encode("utf-8")
    sig = sign_payload(body)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/webhooks/instagram",
            content=body,
            headers={"X-Hub-Signature-256": sig},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["events_processed"] == 1
    assert data["results"][0]["action"] == "connected"

    # Verify user now has active connected account
    connections = configure_test_repo.get_user_connections(user_id)
    assert len(connections) == 1
    assert connections[0].instagram_scoped_id == sender_id
    assert connections[0].status == "ACTIVE"


@pytest.mark.asyncio
async def test_webhook_reel_share_and_idempotency(
    configure_test_repo: InMemoryRepository,
) -> None:
    user_id = uuid4()
    sender_id = "ig_sender_777"

    # Pre-connect user account
    configure_test_repo.upsert_connected_instagram(
        user_id=user_id,
        instagram_scoped_id=sender_id,
        display_username="alice_ig",
    )

    reel_url = "https://www.instagram.com/reel/C3abc123XYZ/"
    message_id = "mid_reel_event_999"

    payload = {
        "object": "instagram",
        "entry": [
            {
                "id": "bot_page_id",
                "time": 1718000000,
                "messaging": [
                    {
                        "sender": {"id": sender_id},
                        "recipient": {"id": "bot_page_id"},
                        "timestamp": 1718000000000,
                        "message": {
                            "mid": message_id,
                            "attachments": [
                                {
                                    "type": "share",
                                    "payload": {
                                        "url": reel_url,
                                        "title": "Amazing pasta recipe!",
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    body = json.dumps(payload).encode("utf-8")
    sig = sign_payload(body)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First delivery -> Creates SavedItem
        res1 = await client.post(
            "/api/v1/webhooks/instagram",
            content=body,
            headers={"X-Hub-Signature-256": sig},
        )
        assert res1.status_code == 200
        assert res1.json()["results"][0]["action"] == "saved"
        assert res1.json()["results"][0]["is_new"] is True

        # Second delivery (exact retry from Meta) -> Idempotently ignored
        res2 = await client.post(
            "/api/v1/webhooks/instagram",
            content=body,
            headers={"X-Hub-Signature-256": sig},
        )
        assert res2.status_code == 200
        assert res2.json()["results"][0]["action"] == "duplicate_ignored"
        assert res2.json()["results"][0]["is_new"] is False

    # Check that exactly 1 SavedItem exists
    items = configure_test_repo.get_saved_items_for_user(user_id)
    assert len(items) == 1
    assert items[0].source_url == reel_url
    assert items[0].caption == "Amazing pasta recipe!"
    assert items[0].provider_item_id == "C3abc123XYZ"
    assert items[0].source_event_id == message_id
    assert items[0].processing_status == "SAVED"


@pytest.mark.asyncio
async def test_webhook_unconnected_sender() -> None:
    payload = {
        "object": "instagram",
        "entry": [
            {
                "id": "bot_page_id",
                "time": 1718000000,
                "messaging": [
                    {
                        "sender": {"id": "stranger_without_connection"},
                        "recipient": {"id": "bot_page_id"},
                        "timestamp": 1718000000000,
                        "message": {
                            "mid": "mid_stranger_1",
                            "text": "https://www.instagram.com/reel/Ctest/",
                        },
                    }
                ],
            }
        ],
    }

    body = json.dumps(payload).encode("utf-8")
    sig = sign_payload(body)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/webhooks/instagram",
            content=body,
            headers={"X-Hub-Signature-256": sig},
        )

    assert response.status_code == 200
    assert response.json()["results"][0]["action"] == "ignored_unconnected_sender"
