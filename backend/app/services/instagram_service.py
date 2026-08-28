import logging
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
REEL_URL_REGEX = re.compile(
    r"https?://(?:www\.)?instagram\.com/(?:reel|reels|p|tv)/([A-Za-z0-9_-]+)/?",
    re.IGNORECASE,
)

META_CDN_HOSTS = {
    "lookaside.fbsbx.com",
    "cdninstagram.com",
    "fbcdn.net",
    "scontent.cdninstagram.com",
}


def is_canonical_instagram_url(url: str | None) -> bool:
    """Returns True if url is a canonical Instagram Reel, Post, or TV URL."""
    if not url:
        return False
    return bool(REEL_URL_REGEX.search(url))


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
                    match = REEL_URL_REGEX.search(url)
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
        match = REEL_URL_REGEX.search(event.text)
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
        2. If sender connected -> extract canonical reel/post & save item idempotently.
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
                    confirmation_message = (
                        "You're connected ♡\n"
                        "Send me any Reel or post here and I'll save it for you."
                    )
                    self._ig_client.send_text_message(
                        recipient_id=sender_id,
                        text=confirmation_message,
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

        # Ignore text messages without media or attachments
        if not source_url and not event.attachments:
            logger.info(
                "No canonical Instagram Reel/Post or attachment found in message"
            )
            return {
                "action": "ignored_no_canonical_media",
                "sender_id": sender_id,
                "user_id": str(connected_account.user_id),
            }

        # 4. Save item idempotently
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
            "SavedItem %s for user %s (is_new=%s)",
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
