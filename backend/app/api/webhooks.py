import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import PlainTextResponse

from app.core.config import settings
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
) -> InstagramService:
    return InstagramService(repository)


@router.get("/instagram")
async def verify_instagram_webhook(
    mode: Annotated[str | None, Query(alias="hub.mode")] = None,
    verify_token: Annotated[str | None, Query(alias="hub.verify_token")] = None,
    challenge: Annotated[str | None, Query(alias="hub.challenge")] = None,
) -> Response:
    """Meta webhook verification handshake (GET)."""
    expected_token = settings.INSTAGRAM_VERIFY_TOKEN
    if not expected_token or mode != "subscribe" or verify_token != expected_token:
        logger.warning("Failed webhook verification attempt")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verification token mismatch or invalid mode",
        )

    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing hub.challenge parameter",
        )

    return PlainTextResponse(content=challenge, status_code=status.HTTP_200_OK)


@router.post("/instagram")
async def handle_instagram_webhook(
    request: Request,
    instagram_service: Annotated[InstagramService, Depends(get_instagram_service)],
) -> dict[str, object]:
    """Incoming Meta Instagram messaging event webhook (POST)."""
    raw_body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    # 1. Verify HMAC signature if app secret is configured
    if not verify_webhook_signature(raw_body, signature, settings.INSTAGRAM_APP_SECRET):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook signature",
        )

    # 2. Parse JSON payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON payload",
        ) from None

    # 3. Extract and normalize events
    events = parse_instagram_webhook_events(payload)
    results: list[dict[str, object]] = []

    for event in events:
        try:
            res = instagram_service.handle_webhook_event(event)
            results.append(res)
        except Exception:
            logger.exception("Error processing webhook event: %s", event.message_id)

    return {"status": "ok", "events_processed": len(events), "results": results}
