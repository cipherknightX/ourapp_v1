import hashlib
import hmac
import json
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.integrations.instagram.client import (
    InstagramClient,
    InstagramClientError,
    get_instagram_client,
)
from app.main import app
from app.repositories.store import InMemoryRepository, get_repository
from app.services.instagram_service import (
    CONNECTION_SUCCESS_MESSAGE,
    FROZEN_POST_REPLY_MESSAGE,
    REEL_SAVE_CONFIRMATION_MESSAGES,
    UNSUPPORTED_MEDIA_REPLY_MESSAGE,
)


@pytest.fixture(autouse=True)
def configure_test_repo(monkeypatch: pytest.MonkeyPatch) -> InMemoryRepository:
    test_repo = InMemoryRepository()
    app.dependency_overrides[get_repository] = lambda: test_repo
    monkeypatch.setattr(settings, "INSTAGRAM_VERIFY_TOKEN", "test_verify_token_123")
    monkeypatch.setattr(settings, "INSTAGRAM_APP_SECRET", "test_secret_xyz")
    monkeypatch.setattr(settings, "INSTAGRAM_POST_CAPTURE_ENABLED", False)
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
    from app.services.instagram_service import InstagramService

    svc = InstagramService(configure_test_repo)
    pending = svc.create_pending_connection(user_id)
    pairing_code = pending.connection_code

    mock_client = MagicMock(spec=InstagramClient)
    mock_client.send_text_message.return_value = {"status": "ok"}
    app.dependency_overrides[get_instagram_client] = lambda: mock_client

    try:
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
        assert data["results"][0]["confirmation_dm_sent"] is True

        mock_client.send_text_message.assert_called_once()
        assert mock_client.send_text_message.call_args[1]["recipient_id"] == sender_id
        assert (
            mock_client.send_text_message.call_args[1]["text"]
            == CONNECTION_SUCCESS_MESSAGE
        )

        connections = configure_test_repo.get_user_connections(user_id)
        assert len(connections) == 1
        assert connections[0].instagram_scoped_id == sender_id
        assert connections[0].status == "ACTIVE"
    finally:
        app.dependency_overrides.pop(get_instagram_client, None)


@pytest.mark.asyncio
async def test_webhook_pairing_handshake_messaging_failure_retains_connection(
    configure_test_repo: InMemoryRepository,
) -> None:
    user_id = uuid4()
    from app.services.instagram_service import InstagramService

    svc = InstagramService(configure_test_repo)
    pending = svc.create_pending_connection(user_id)
    pairing_code = pending.connection_code

    mock_client = MagicMock(spec=InstagramClient)
    mock_client.send_text_message.side_effect = InstagramClientError(
        "Rate limit exceeded"
    )
    app.dependency_overrides[get_instagram_client] = lambda: mock_client

    try:
        sender_id = "ig_sender_fail_case"
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
                                "mid": "m_mid_handshake_fail",
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
        assert data["results"][0]["action"] == "connected"
        assert data["results"][0]["confirmation_dm_sent"] is False

        connections = configure_test_repo.get_user_connections(user_id)
        assert len(connections) == 1
        assert connections[0].instagram_scoped_id == sender_id
        assert connections[0].status == "ACTIVE"
    finally:
        app.dependency_overrides.pop(get_instagram_client, None)


@pytest.mark.asyncio
async def test_webhook_reel_share_and_idempotency_when_post_capture_disabled(
    configure_test_repo: InMemoryRepository,
) -> None:
    """Reel capture remains 100% functional even when
    INSTAGRAM_POST_CAPTURE_ENABLED=False.
    """
    user_id = uuid4()
    sender_id = "ig_sender_777"

    configure_test_repo.upsert_connected_instagram(
        user_id=user_id,
        instagram_scoped_id=sender_id,
        display_username="alice_ig",
    )

    mock_client = MagicMock(spec=InstagramClient)
    mock_client.send_text_message.return_value = {"status": "ok"}
    app.dependency_overrides[get_instagram_client] = lambda: mock_client

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
                                    "type": "ig_reel",
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

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # First delivery -> Creates SavedItem & sends confirmation DM
            res1 = await client.post(
                "/api/v1/webhooks/instagram",
                content=body,
                headers={"X-Hub-Signature-256": sig},
            )
            assert res1.status_code == 200
            assert res1.json()["results"][0]["action"] == "saved"
            assert res1.json()["results"][0]["is_new"] is True
            assert res1.json()["results"][0]["confirmation_dm_sent"] is True

            mock_client.send_text_message.assert_called_once()
            call_args = mock_client.send_text_message.call_args[1]
            assert call_args["recipient_id"] == sender_id
            assert call_args["text"] in REEL_SAVE_CONFIRMATION_MESSAGES

            # Second delivery -> Idempotently ignored (NO duplicate DM)
            mock_client.send_text_message.reset_mock()
            res2 = await client.post(
                "/api/v1/webhooks/instagram",
                content=body,
                headers={"X-Hub-Signature-256": sig},
            )
            assert res2.status_code == 200
            assert res2.json()["results"][0]["action"] == "duplicate_ignored"
            assert res2.json()["results"][0]["is_new"] is False
            assert res2.json()["results"][0]["confirmation_dm_sent"] is False
            mock_client.send_text_message.assert_not_called()

        # Check that exactly 1 SavedItem exists
        items = configure_test_repo.get_saved_items_for_user(user_id)
        assert len(items) == 1
        assert items[0].source_url == reel_url
        assert items[0].caption == "Amazing pasta recipe!"
        assert items[0].provider_item_id == "C3abc123XYZ"
        assert items[0].source_event_id == message_id
        assert items[0].processing_status == "SAVED"
    finally:
        app.dependency_overrides.pop(get_instagram_client, None)


@pytest.mark.asyncio
async def test_webhook_frozen_post_sends_friendly_reply_and_does_not_save(
    configure_test_repo: InMemoryRepository,
) -> None:
    """When INSTAGRAM_POST_CAPTURE_ENABLED=False and an ig_post or /p/ URL is sent:

    - Post does NOT create SavedItem
    - Sends friendly frozen post reply DM
    - Duplicate delivery does NOT resend reply.
    """
    user_id = uuid4()
    sender_id = "ig_sender_frozen"

    configure_test_repo.upsert_connected_instagram(
        user_id=user_id,
        instagram_scoped_id=sender_id,
        display_username="frozen_user",
    )

    mock_client = MagicMock(spec=InstagramClient)
    mock_client.send_text_message.return_value = {"status": "ok"}
    app.dependency_overrides[get_instagram_client] = lambda: mock_client

    message_id = "mid_static_post_frozen_1"
    post_url = "https://www.instagram.com/p/C987654321/"

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
                                        "url": post_url,
                                        "title": "Photo of sunset",
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

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # First delivery
            res1 = await client.post(
                "/api/v1/webhooks/instagram",
                content=body,
                headers={"X-Hub-Signature-256": sig},
            )
            assert res1.status_code == 200
            data1 = res1.json()
            assert data1["results"][0]["action"] == "ignored_post_capture_disabled"
            assert data1["results"][0]["reply_sent"] is True

            # Friendly frozen post reply was sent
            mock_client.send_text_message.assert_called_once()
            call_args = mock_client.send_text_message.call_args[1]
            assert call_args["recipient_id"] == sender_id
            assert call_args["text"] == FROZEN_POST_REPLY_MESSAGE

            # Second delivery (duplicate delivery from Meta)
            mock_client.send_text_message.reset_mock()
            res2 = await client.post(
                "/api/v1/webhooks/instagram",
                content=body,
                headers={"X-Hub-Signature-256": sig},
            )
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["results"][0]["action"] == "ignored_post_capture_disabled"
            assert data2["results"][0]["reply_sent"] is False
            # Deduplication prevented duplicate reply
            mock_client.send_text_message.assert_not_called()

        # Confirm NO SavedItem was created
        items = configure_test_repo.get_saved_items_for_user(user_id)
        assert len(items) == 0
    finally:
        app.dependency_overrides.pop(get_instagram_client, None)


@pytest.mark.parametrize(
    "attachment_type",
    ["image", "video", "audio", "file", "animated_image", "fallback"],
)
@pytest.mark.asyncio
async def test_webhook_unsupported_attachments_send_generic_unsupported_reply(
    configure_test_repo: InMemoryRepository,
    attachment_type: str,
) -> None:
    """Non-Reel and non-Post attachments send the generic unsupported media reply."""
    user_id = uuid4()
    sender_id = f"ig_sender_{attachment_type}"

    configure_test_repo.upsert_connected_instagram(
        user_id=user_id,
        instagram_scoped_id=sender_id,
    )

    mock_client = MagicMock(spec=InstagramClient)
    mock_client.send_text_message.return_value = {"status": "ok"}
    app.dependency_overrides[get_instagram_client] = lambda: mock_client

    message_id = f"mid_unsupported_{attachment_type}_1"
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
                                    "type": attachment_type,
                                    "payload": {
                                        "url": f"https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id={attachment_type}_123",
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

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # First delivery
            res1 = await client.post(
                "/api/v1/webhooks/instagram",
                content=body,
                headers={"X-Hub-Signature-256": sig},
            )
            assert res1.status_code == 200
            data1 = res1.json()
            assert data1["results"][0]["action"] == "ignored_unsupported_media"
            assert data1["results"][0]["reply_sent"] is True

            # Generic unsupported reply was sent
            mock_client.send_text_message.assert_called_once()
            call_args = mock_client.send_text_message.call_args[1]
            assert call_args["recipient_id"] == sender_id
            assert call_args["text"] == UNSUPPORTED_MEDIA_REPLY_MESSAGE

            # Second delivery -> Deduplicated (no duplicate DM)
            mock_client.send_text_message.reset_mock()
            res2 = await client.post(
                "/api/v1/webhooks/instagram",
                content=body,
                headers={"X-Hub-Signature-256": sig},
            )
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["results"][0]["action"] == "ignored_unsupported_media"
            assert data2["results"][0]["reply_sent"] is False
            mock_client.send_text_message.assert_not_called()

        items = configure_test_repo.get_saved_items_for_user(user_id)
        assert len(items) == 0
    finally:
        app.dependency_overrides.pop(get_instagram_client, None)


@pytest.mark.asyncio
async def test_webhook_post_capture_when_enabled(
    configure_test_repo: InMemoryRepository,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When INSTAGRAM_POST_CAPTURE_ENABLED=True, existing Post capture code runs."""
    monkeypatch.setattr(settings, "INSTAGRAM_POST_CAPTURE_ENABLED", True)

    user_id = uuid4()
    sender_id = "ig_sender_enabled"

    configure_test_repo.upsert_connected_instagram(
        user_id=user_id,
        instagram_scoped_id=sender_id,
    )

    post_url = "https://www.instagram.com/p/C_EnabledPost123/"
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
                            "mid": "mid_enabled_post_1",
                            "attachments": [
                                {
                                    "type": "share",
                                    "payload": {
                                        "url": post_url,
                                        "title": "Summer Vibe",
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
        res = await client.post(
            "/api/v1/webhooks/instagram",
            content=body,
            headers={"X-Hub-Signature-256": sig},
        )
        assert res.status_code == 200
        assert res.json()["results"][0]["action"] == "saved"

    items = configure_test_repo.get_saved_items_for_user(user_id)
    assert len(items) == 1
    assert items[0].source_url == post_url
    assert items[0].provider_item_id == "C_EnabledPost123"


@pytest.mark.asyncio
async def test_webhook_plain_text_message(
    configure_test_repo: InMemoryRepository,
) -> None:
    """Plain text messages without Reel/Post URLs are gracefully ignored without DM."""
    user_id = uuid4()
    sender_id = "ig_sender_plain_text"

    configure_test_repo.upsert_connected_instagram(
        user_id=user_id,
        instagram_scoped_id=sender_id,
    )

    mock_client = MagicMock(spec=InstagramClient)
    app.dependency_overrides[get_instagram_client] = lambda: mock_client

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
                            "mid": "mid_hello_1",
                            "text": "Hello there!",
                        },
                    }
                ],
            }
        ],
    }

    body = json.dumps(payload).encode("utf-8")
    sig = sign_payload(body)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/v1/webhooks/instagram",
                content=body,
                headers={"X-Hub-Signature-256": sig},
            )
            assert res.status_code == 200
            assert res.json()["results"][0]["action"] == "ignored_no_canonical_media"

        mock_client.send_text_message.assert_not_called()
        assert len(configure_test_repo.get_saved_items_for_user(user_id)) == 0
    finally:
        app.dependency_overrides.pop(get_instagram_client, None)


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
