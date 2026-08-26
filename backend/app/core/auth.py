from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import settings
from app.schemas.user import UserContext

security_bearer = HTTPBearer(auto_error=False)

_jwk_client: PyJWKClient | None = None


def get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        jwks_url = settings.resolved_jwks_url
        if not jwks_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication provider JWKS URL is not configured",
            )
        _jwk_client = PyJWKClient(jwks_url)
    return _jwk_client


def set_jwk_client(client: PyJWKClient | None) -> None:
    """Helper to set or override the JWK client (useful for testing)."""
    global _jwk_client
    _jwk_client = client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    jwk_client: PyJWKClient = Depends(get_jwk_client),
) -> UserContext:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    jwt_issuer = settings.resolved_jwt_issuer

    try:
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        decode_kwargs: dict[str, object] = {
            "algorithms": ["RS256", "ES256"],
            "audience": settings.SUPABASE_JWT_AUDIENCE,
            "options": {
                "require": ["exp", "sub", "aud"],
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": bool(jwt_issuer),
            },
        }

        if jwt_issuer:
            decode_kwargs["issuer"] = jwt_issuer

        payload = jwt.decode(
            token,
            signing_key.key,
            **decode_kwargs,  # type: ignore[arg-type]
        )

        sub = payload.get("sub")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject claim",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = UUID(str(sub))
        return UserContext(
            user_id=user_id,
            email=payload.get("email"),
            role=payload.get("role"),
        )

    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except (
        jwt.InvalidIssuerError,
        jwt.InvalidAudienceError,
        jwt.InvalidSignatureError,
        jwt.DecodeError,
        jwt.PyJWTError,
        ValueError,
    ) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {type(e).__name__}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
