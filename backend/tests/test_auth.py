import time
from collections.abc import Generator
from typing import Any
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.core import auth
from app.core.auth import get_jwk_client
from app.core.config import Settings, settings
from app.main import app

# Generate RSA test keys
_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_public_key = _private_key.public_key()

_other_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class MockSigningKey:
    def __init__(self, key: Any) -> None:
        self.key = key


class MockJWKClient:
    def __init__(self, key: Any) -> None:
        self._key = key

    def get_signing_key_from_jwt(self, token: str) -> MockSigningKey:
        return MockSigningKey(self._key)


def generate_test_jwt(
    payload: dict[str, Any] | None = None,
    private_key: Any = _private_key,
    headers: dict[str, Any] | None = None,
) -> str:
    now = int(time.time())
    default_payload = {
        "sub": str(uuid4()),
        "email": "user@example.com",
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "iss": settings.resolved_jwt_issuer or "https://test.supabase.co/auth/v1",
        "exp": now + 3600,
        "iat": now,
    }
    if payload:
        default_payload.update(payload)

    token_headers = {"kid": "test-key-id"}
    if headers:
        token_headers.update(headers)

    return str(
        jwt.encode(
            default_payload,
            private_key,
            algorithm="RS256",
            headers=token_headers,
        )
    )


@pytest.fixture(autouse=True)
def setup_mock_jwk_client(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[None, None, None]:
    # Configure test issuer/audience
    monkeypatch.setattr(
        settings, "SUPABASE_JWT_ISSUER", "https://test.supabase.co/auth/v1"
    )
    monkeypatch.setattr(settings, "SUPABASE_JWT_AUDIENCE", "authenticated")

    mock_client = MockJWKClient(_public_key)
    app.dependency_overrides[get_jwk_client] = lambda: mock_client
    yield
    app.dependency_overrides.pop(get_jwk_client, None)


def test_supabase_config_resolution() -> None:
    # Test clean resolution from SUPABASE_URL without trailing slash
    cfg1 = Settings(SUPABASE_URL="https://example.supabase.co")
    assert (
        cfg1.resolved_jwks_url
        == "https://example.supabase.co/auth/v1/.well-known/jwks.json"
    )
    assert cfg1.resolved_jwt_issuer == "https://example.supabase.co/auth/v1"

    # Test clean resolution from SUPABASE_URL with trailing slash
    cfg2 = Settings(SUPABASE_URL="https://example.supabase.co/")
    assert (
        cfg2.resolved_jwks_url
        == "https://example.supabase.co/auth/v1/.well-known/jwks.json"
    )
    assert cfg2.resolved_jwt_issuer == "https://example.supabase.co/auth/v1"

    # Test explicit override takes precedence
    cfg3 = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_JWKS_URL="https://custom.supabase.co/jwks.json",
        SUPABASE_JWT_ISSUER="https://custom.supabase.co/issuer",
    )
    assert cfg3.resolved_jwks_url == "https://custom.supabase.co/jwks.json"
    assert cfg3.resolved_jwt_issuer == "https://custom.supabase.co/issuer"


def test_missing_supabase_url_raises_configuration_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "SUPABASE_URL", "")
    monkeypatch.setattr(settings, "SUPABASE_JWKS_URL", None)
    monkeypatch.setattr(auth, "_jwk_client", None)

    assert settings.resolved_jwks_url is None
    with pytest.raises(HTTPException) as exc_info:
        auth.get_jwk_client()

    assert exc_info.value.status_code == 500
    assert "JWKS URL is not configured" in exc_info.value.detail


@pytest.mark.asyncio
async def test_auth_me_unauthenticated() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert "Missing authentication credentials" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_malformed_header() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Basic some_credentials"},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_expired_token() -> None:
    past_time = int(time.time()) - 100
    token = generate_test_jwt(payload={"exp": past_time, "iat": past_time - 100})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auth_me_invalid_signature() -> None:
    token = generate_test_jwt(private_key=_other_private_key)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_invalid_issuer() -> None:
    token = generate_test_jwt(payload={"iss": "https://attacker.supabase.co/auth/v1"})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_invalid_audience() -> None:
    token = generate_test_jwt(payload={"aud": "wrong-audience"})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_missing_sub() -> None:
    now = int(time.time())
    token = jwt.encode(
        {
            "email": "user@example.com",
            "aud": "authenticated",
            "iss": "https://test.supabase.co/auth/v1",
            "exp": now + 3600,
            "iat": now,
        },
        _private_key,
        algorithm="RS256",
        headers={"kid": "test-key-id"},
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert "invalid token" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auth_me_malformed_sub() -> None:
    token = generate_test_jwt(payload={"sub": "not-a-valid-uuid"})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_valid_token() -> None:
    user_id = str(uuid4())
    user_email = "alice@example.com"
    token = generate_test_jwt(payload={"sub": user_id, "email": user_email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["email"] == user_email


@pytest.mark.asyncio
async def test_auth_identity_cannot_be_overridden() -> None:
    authoritative_user_id = str(uuid4())
    attacker_spoofed_user_id = str(uuid4())
    token = generate_test_jwt(
        payload={"sub": authoritative_user_id, "email": "victim@example.com"}
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/auth/me?user_id={attacker_spoofed_user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == authoritative_user_id
    assert data["id"] != attacker_spoofed_user_id
