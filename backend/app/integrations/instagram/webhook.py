import hashlib
import hmac
import logging
from typing import Any

from app.schemas.instagram import NormalizedInstagramEvent

logger = logging.getLogger(__name__)


def verify_webhook_signature(
    raw_body: bytes,
    signature_header: str | None,
    app_secret: str,
) -> bool:
    """Validate X-Hub-Signature-256 header sent by Meta."""
    if not app_secret:
        # If no secret configured in dev, allow signature check to pass
        return True

    if not signature_header:
        logger.warning("Missing X-Hub-Signature-256 header")
        return False

    if not signature_header.startswith("sha256="):
        logger.warning("Malformed X-Hub-Signature-256 header prefix")
        return False

    received_sig = signature_header.removeprefix("sha256=")
    expected_sig = hmac.new(
        app_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(received_sig, expected_sig)


def parse_instagram_webhook_events(
    payload: dict[str, Any],
) -> list[NormalizedInstagramEvent]:
    """Parse raw Meta Instagram messaging webhook payload into normalized events."""
    events: list[NormalizedInstagramEvent] = []

    object_type = payload.get("object")
    if object_type != "instagram":
        logger.info("Ignoring non-instagram webhook object: %s", object_type)
        return events

    entries = payload.get("entry", [])
    if not isinstance(entries, list):
        return events

    for entry in entries:
        if not isinstance(entry, dict):
            continue

        entry_id = str(entry.get("id", ""))
        messaging_list = entry.get("messaging", [])
        if not isinstance(messaging_list, list):
            continue

        for msg_item in messaging_list:
            if not isinstance(msg_item, dict):
                continue

            sender = msg_item.get("sender", {})
            recipient = msg_item.get("recipient", {})
            sender_id = str(sender.get("id", "")) if isinstance(sender, dict) else ""
            recipient_id = (
                str(recipient.get("id", "")) if isinstance(recipient, dict) else ""
            )

            timestamp = int(msg_item.get("timestamp", 0))
            message = msg_item.get("message", {})
            if not isinstance(message, dict):
                continue

            mid = str(message.get("mid", ""))
            if not mid or not sender_id:
                continue

            text = message.get("text")
            if text is not None:
                text = str(text).strip()

            raw_attachments = message.get("attachments", [])
            attachments: list[dict[str, object]] = []
            if isinstance(raw_attachments, list):
                for att in raw_attachments:
                    if isinstance(att, dict):
                        attachments.append(att)

            event = NormalizedInstagramEvent(
                provider_event_id=entry_id,
                sender_id=sender_id,
                recipient_id=recipient_id,
                timestamp=timestamp,
                message_id=mid,
                text=text,
                attachments=attachments,
                raw_payload=msg_item,
            )
            events.append(event)

    return events
