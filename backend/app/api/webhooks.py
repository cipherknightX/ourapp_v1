import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status

from app.core.config import settings
from app.integrations.instagram.client import (
    InstagramClient,
    get_instagram_client,
)
from app.integrations.instagram.webhook import (
    parse_instagram_webhook_events,
    verify_webhook_signature,
)
from app.repositories.base import RepositoryProtocol
from app.repositories.store import get_repository
from app.services.instagram_service import InstagramService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def get_instagram_service(
    repository: Annotated[RepositoryProtocol, Depends(get_repository)],
    instagram_client: Annotated[InstagramClient, Depends(get_instagram_client)],
) -> InstagramService:
    return InstagramService(repository, instagram_client)


@router.get("/instagram")
async def verify_instagram_webhook(
    hub_mode: Annotated[str | None, Query(alias="hub.mode")] = None,
    hub_verify_token: Annotated[str | None, Query(alias="hub.verify_token")] = None,
    hub_challenge: Annotated[str | None, Query(alias="hub.challenge")] = None,
) -> int:
    """Handles Meta webhook verification challenge.

    Validates that hub.mode is 'subscribe' and hub.verify_token matches settings.
    Returns hub.challenge as integer per Meta specification.
    """
    expected_token = settings.INSTAGRAM_VERIFY_TOKEN

    if not hub_mode or not hub_verify_token or not hub_challenge:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing required webhook verification parameters",
        )

    if hub_mode != "subscribe" or hub_verify_token != expected_token:
        logger.warning("Instagram webhook verification failed with invalid token")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verification token mismatch or unsupported hub.mode",
        )

    try:
        return int(hub_challenge)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge parameter must be numeric",
        ) from None


@router.post("/instagram")
async def receive_instagram_webhook(
    request: Request,
    instagram_service: Annotated[InstagramService, Depends(get_instagram_service)],
    signature: Annotated[str | None, Header(alias="X-Hub-Signature-256")] = None,
) -> dict[str, object]:
    """Ingests and processes incoming Instagram messaging webhooks.

    1. Validates HMAC signature if INSTAGRAM_APP_SECRET is configured
    2. Parses & normalizes events
    3. Triggers fast-path durable save / connection pairing
    4. Responds fast (< 5s)
    """
    raw_body = await request.body()

    # 1. Verify HMAC signature if app secret is configured
    if not verify_webhook_signature(raw_body, signature, settings.INSTAGRAM_APP_SECRET):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook signature",
        )

    # 2. Parse payload into normalized events
    try:
        body_json = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        ) from exc

    events = parse_instagram_webhook_events(body_json)

    # 3. Process events synchronously on the fast path
    results: list[dict[str, object]] = []
    for event in events:
        res = instagram_service.handle_webhook_event(event)
        results.append(res)

    return {
        "status": "received",
        "events_processed": len(events),
        "results": results,
    }
