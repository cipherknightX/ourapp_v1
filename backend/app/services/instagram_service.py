import logging
import random
import re
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse
from uuid import UUID

from app.core.config import settings
from app.integrations.instagram.client import (
    InstagramClient,
    InstagramClientError,
    get_instagram_client,
)
from app.repositories.base import RepositoryProtocol
from app.schemas.instagram import (
    ConnectedInstagramRead,
    NormalizedInstagramEvent,
    PendingConnectionRead,
)

logger = logging.getLogger(__name__)

# Regex for matching canonical Instagram Reel and Post URLs
CANONICAL_IG_URL_REGEX = re.compile(
    r"https?://(?:www\.)?instagram\.com/(?:reel|reels|p|tv)/([A-Za-z0-9_-]+)/?",
    re.IGNORECASE,
)

REEL_URL_REGEX = re.compile(
    r"https?://(?:www\.)?instagram\.com/(?:reel|reels)/([A-Za-z0-9_-]+)/?",
    re.IGNORECASE,
)

POST_URL_REGEX = re.compile(
    r"https?://(?:www\.)?instagram\.com/(?:p|tv)/([A-Za-z0-9_-]+)/?",
    re.IGNORECASE,
)

META_CDN_HOSTS = {
    "lookaside.fbsbx.com",
    "cdninstagram.com",
    "fbcdn.net",
    "scontent.cdninstagram.com",
}

CONNECTION_SUCCESS_MESSAGE = (
    "You're connected ♡\nSend me a Reel here and I'll remember it for you."
)

FROZEN_POST_REPLY_MESSAGE = (
    "Ahh, I’m still teaching myself posts 😭\n"
    "Send me a Reel for now and I’ll save it for you ♡"
)

UNSUPPORTED_MEDIA_REPLY_MESSAGE = (
    "Ahh, I can save Reels right now 😭\nSend me a Reel and I’ll remember it for you ♡"
)

REEL_SAVE_CONFIRMATION_MESSAGES = [
    "Got it ♡ Saved for you.",
    "Yep, I've got it 😌",
    "Saved ✨",
    "I remembered this one ♡",
    "Got it. Tucked away safely.",
    "Yep, that's saved 😌",
    "Added to your collection ✨",
    "I've got this one too ♡",
    "Saved and tucked away.",
    "Gotcha 😌 It's in your library.",
]


def is_canonical_instagram_url(url: str | None) -> bool:
    """Returns True if url is a canonical Instagram Reel, Post, or TV URL."""
    if not url:
        return False
    return bool(CANONICAL_IG_URL_REGEX.search(url))


def is_meta_cdn_asset_url(url: str | None) -> bool:
    """Returns True if url points to a Meta/Facebook CDN media asset."""
    if not url:
        return False
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        return any(
            hostname == cdn or hostname.endswith("." + cdn) for cdn in META_CDN_HOSTS
        )
    except Exception:
        return False


def generate_pairing_code() -> str:
    random_suffix = secrets.token_hex(4).upper()
    return f"CONNECT-{random_suffix}"


def extract_media_from_event(
    event: NormalizedInstagramEvent,
) -> tuple[str | None, str | None, str | None, str | None]:
    """Extract media details from an Instagram message event.

    Returns (source_url, provider_item_id, caption, thumbnail_url).
    Guarantees source_url is populated ONLY when a canonical Instagram post URL exists.
    Meta CDN asset URLs are never treated as the canonical source_url.
    """
    source_url: str | None = None
    provider_item_id: str | None = None
    caption: str | None = None
    thumbnail_url: str | None = None

    # 1. Check attachments (share / reel / static post attachments)
    for attachment in event.attachments:
        payload = attachment.get("payload", {})
        if isinstance(payload, dict):
            url = payload.get("url")
            if url and isinstance(url, str):
                if is_canonical_instagram_url(url):
                    source_url = url
                    match = CANONICAL_IG_URL_REGEX.search(url)
                    if match:
                        provider_item_id = match.group(1)

            # Fallback to payload or attachment ID for non-canonical shares
            if not provider_item_id:
                raw_id = (
                    payload.get("id") or payload.get("asset_id") or attachment.get("id")
                )
                if raw_id:
                    provider_item_id = str(raw_id)

            title = payload.get("title")
            if title and isinstance(title, str):
                caption = title

    # 2. If no canonical URL in attachments, search message text
    if not source_url and event.text:
        match = CANONICAL_IG_URL_REGEX.search(event.text)
        if match:
            source_url = match.group(0)
            provider_item_id = match.group(1)
            caption = event.text

    return source_url, provider_item_id, caption, thumbnail_url


class InstagramService:
    def __init__(
        self,
        repository: RepositoryProtocol,
        instagram_client: InstagramClient | None = None,
    ) -> None:
        self._repo = repository
        self._ig_client = instagram_client or get_instagram_client()

    def create_pending_connection(self, user_id: UUID) -> PendingConnectionRead:
        code = generate_pairing_code()
        expires_at = datetime.now(UTC) + timedelta(minutes=15)
        bot_username = settings.INSTAGRAM_BOT_USERNAME or "save.this.for.me"
        dm_link = f"https://ig.me/m/{bot_username}?text={code}"

        return self._repo.create_pending_connection(
            user_id=user_id,
            connection_code=code,
            expires_at=expires_at,
            bot_username=bot_username,
            dm_link=dm_link,
        )

    def get_user_connections(self, user_id: UUID) -> list[ConnectedInstagramRead]:
        return self._repo.get_user_connections(user_id=user_id)

    def disconnect_account(self, user_id: UUID, connection_id: UUID) -> bool:
        return self._repo.disconnect_instagram(
            user_id=user_id, connection_id=connection_id
        )

    def handle_webhook_event(
        self, event: NormalizedInstagramEvent
    ) -> dict[str, object]:
        """Processes normalized Instagram event.

        1. If pairing code -> activate connection and attempt confirmation DM.
        2. If sender connected:
           - If Reel -> extract & save item idempotently.
             On new save, send confirmation DM.
           - If Post -> save if INSTAGRAM_POST_CAPTURE_ENABLED,
             else send friendly frozen post reply DM and return 200 without saving.
           - If other attachment -> send generic unsupported media reply DM.
           - If plain text -> ignore gracefully without DM.
        3. Otherwise -> log safe diagnostic.
        """
        sender_id = event.sender_id
        msg_text = event.text.strip() if event.text else ""

        # 1. Check for connection pairing handshake
        if msg_text.startswith("CONNECT-"):
            pending = self._repo.get_pending_connection_by_code(msg_text)
            if pending:
                self._repo.consume_pending_connection(msg_text)
                connection = self._repo.upsert_connected_instagram(
                    user_id=pending.user_id,
                    instagram_scoped_id=sender_id,
                )
                sender_suffix = sender_id[-4:] if len(sender_id) >= 4 else sender_id
                logger.info(
                    "Connected Instagram sender ending in ...%s to user %s",
                    sender_suffix,
                    pending.user_id,
                )

                # Attempt connection confirmation DM (secondary; never undoes state)
                confirmation_sent = False
                try:
                    self._ig_client.send_text_message(
                        recipient_id=sender_id,
                        text=CONNECTION_SUCCESS_MESSAGE,
                    )
                    confirmation_sent = True
                    logger.info("Sent connection confirmation DM to sender")
                except InstagramClientError as exc:
                    logger.warning(
                        "Connection confirmation DM could not be sent: %s", exc
                    )
                except Exception as exc:
                    logger.warning(
                        "Unexpected error sending connection confirmation DM: %s",
                        type(exc).__name__,
                    )

                return {
                    "action": "connected",
                    "user_id": str(pending.user_id),
                    "connection_id": str(connection.id),
                    "confirmation_dm_sent": confirmation_sent,
                }

        # 2. Check if sender is an existing connected account
        connected_account = self._repo.get_connected_instagram_by_scoped_id(sender_id)
        if not connected_account:
            logger.info("Received event from unmapped Instagram sender")
            return {"action": "ignored_unconnected_sender", "sender_id": sender_id}

        # 3. Extract media / reel / static post
        source_url, item_id, caption, thumb = extract_media_from_event(event)

        # Ignore plain text messages without media or attachments
        if not source_url and not event.attachments:
            logger.info(
                "No canonical Instagram Reel/Post or attachment found in message"
            )
            return {
                "action": "ignored_no_canonical_media",
                "sender_id": sender_id,
                "user_id": str(connected_account.user_id),
            }

        # 4. Check whether content is an Instagram Reel
        is_reel = any(
            att.get("type") in ("ig_reel", "reel") for att in event.attachments
        ) or bool(source_url and REEL_URL_REGEX.search(source_url))

        if is_reel:
            # Existing Reel capture flow
            saved_item, is_new = self._repo.create_saved_item_idempotent(
                user_id=connected_account.user_id,
                connected_instagram_id=connected_account.id,
                platform="instagram",
                source_url=source_url or "",
                provider_item_id=item_id,
                source_event_id=event.message_id,
                caption=caption,
                creator_username=None,
                thumbnail_url=thumb,
                raw_metadata=event.raw_payload,
            )

            logger.info(
                "SavedItem %s (Reel) for user %s (is_new=%s)",
                saved_item.id,
                connected_account.user_id,
                is_new,
            )

            confirmation_dm_sent = False
            # Send confirmation DM ONLY when this is a newly saved item
            if is_new:
                try:
                    confirmation_text = random.choice(REEL_SAVE_CONFIRMATION_MESSAGES)
                    self._ig_client.send_text_message(
                        recipient_id=sender_id,
                        text=confirmation_text,
                    )
                    confirmation_dm_sent = True
                    logger.info("Sent save confirmation DM for Reel to sender")
                except InstagramClientError as exc:
                    logger.warning("Could not send Reel save confirmation DM: %s", exc)
                except Exception as exc:
                    logger.warning(
                        "Unexpected error sending Reel save confirmation DM: %s",
                        type(exc).__name__,
                    )

            return {
                "action": "saved" if is_new else "duplicate_ignored",
                "saved_item_id": str(saved_item.id),
                "is_new": is_new,
                "user_id": str(connected_account.user_id),
                "confirmation_dm_sent": confirmation_dm_sent,
            }

        # 5. Check whether content is an Instagram Post (/p/, /tv/, ig_post)
        is_post = any(
            att.get("type") in ("ig_post", "post") for att in event.attachments
        ) or bool(source_url and POST_URL_REGEX.search(source_url))

        if is_post:
            if settings.INSTAGRAM_POST_CAPTURE_ENABLED:
                # Existing Post capture flow when feature flag is enabled
                saved_item, is_new = self._repo.create_saved_item_idempotent(
                    user_id=connected_account.user_id,
                    connected_instagram_id=connected_account.id,
                    platform="instagram",
                    source_url=source_url or "",
                    provider_item_id=item_id,
                    source_event_id=event.message_id,
                    caption=caption,
                    creator_username=None,
                    thumbnail_url=thumb,
                    raw_metadata=event.raw_payload,
                )

                logger.info(
                    "SavedItem %s (Post) for user %s (is_new=%s)",
                    saved_item.id,
                    connected_account.user_id,
                    is_new,
                )

                return {
                    "action": "saved" if is_new else "duplicate_ignored",
                    "saved_item_id": str(saved_item.id),
                    "is_new": is_new,
                    "user_id": str(connected_account.user_id),
                }

            # Post capture is temporarily frozen: send friendly frozen post reply
            is_new_event = self._repo.record_or_check_event(event.message_id)
            reply_sent = False

            if is_new_event:
                try:
                    self._ig_client.send_text_message(
                        recipient_id=sender_id,
                        text=FROZEN_POST_REPLY_MESSAGE,
                    )
                    reply_sent = True
                    sender_suffix = sender_id[-4:] if len(sender_id) >= 4 else sender_id
                    logger.info(
                        "Sent friendly post reply to sender ending in ...%s",
                        sender_suffix,
                    )
                except InstagramClientError as exc:
                    logger.warning(
                        "Could not send friendly post reply to sender: %s", exc
                    )
                except Exception as exc:
                    logger.warning(
                        "Unexpected error sending friendly post reply: %s",
                        type(exc).__name__,
                    )

            return {
                "action": "ignored_post_capture_disabled",
                "sender_id": sender_id,
                "user_id": str(connected_account.user_id),
                "reply_sent": reply_sent,
                "is_new_event": is_new_event,
            }

        # 6. Other unsupported attachments (image upload, video, audio, file, gif, etc.)
        is_new_event = self._repo.record_or_check_event(event.message_id)
        reply_sent = False

        if is_new_event:
            try:
                self._ig_client.send_text_message(
                    recipient_id=sender_id,
                    text=UNSUPPORTED_MEDIA_REPLY_MESSAGE,
                )
                reply_sent = True
                logger.info(
                    "Sent unsupported media reply to sender ending in ...%s",
                    sender_id[-4:] if len(sender_id) >= 4 else sender_id,
                )
            except InstagramClientError as exc:
                logger.warning(
                    "Could not send unsupported media reply to sender: %s", exc
                )
            except Exception as exc:
                logger.warning(
                    "Unexpected error sending unsupported media reply: %s",
                    type(exc).__name__,
                )

        return {
            "action": "ignored_unsupported_media",
            "sender_id": sender_id,
            "user_id": str(connected_account.user_id),
            "reply_sent": reply_sent,
            "is_new_event": is_new_event,
        }
