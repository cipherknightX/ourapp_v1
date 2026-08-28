import logging
from typing import Any, cast

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class InstagramClientError(Exception):
    """Raised when an error occurs during an outbound Instagram API request."""


class InstagramClient:
    def __init__(
        self,
        access_token: str | None = None,
        api_version: str | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self._access_token = access_token or settings.INSTAGRAM_ACCESS_TOKEN
        self._api_version = api_version or settings.INSTAGRAM_GRAPH_API_VERSION
        self._base_url = f"https://graph.instagram.com/{self._api_version}"
        self._client = client

    def send_text_message(self, recipient_id: str, text: str) -> dict[str, Any]:
        """Sends a text message to a user via the Instagram Graph API.

        Endpoint: POST https://graph.instagram.com/{version}/me/messages
        """
        if not self._access_token:
            raise InstagramClientError("Instagram access token is not configured")

        url = f"{self._base_url}/me/messages"
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": text},
        }

        try:
            if self._client is not None:
                response = self._client.post(
                    url, headers=headers, json=payload, timeout=5.0
                )
            else:
                with httpx.Client(timeout=5.0) as http_client:
                    response = http_client.post(url, headers=headers, json=payload)

            if response.status_code >= 400:
                try:
                    error_data = response.json()
                    error_msg = (
                        error_data.get("error", {}).get("message")
                        or f"Status {response.status_code}"
                    )
                except Exception:
                    error_msg = f"Status {response.status_code}"

                suffix = recipient_id[-4:] if len(recipient_id) >= 4 else recipient_id
                logger.warning(
                    "Instagram Send API returned error for ...%s: %s",
                    suffix,
                    error_msg,
                )
                raise InstagramClientError(f"Meta Send API error: {error_msg}")

            data = response.json()
            return cast(dict[str, Any], data if isinstance(data, dict) else {})
        except httpx.RequestError as exc:
            logger.warning(
                "Instagram Send API network request failed: %s", type(exc).__name__
            )
            raise InstagramClientError(
                f"Network error communicating with Meta: {type(exc).__name__}"
            ) from exc


_default_instagram_client = InstagramClient()


def get_instagram_client() -> InstagramClient:
    return _default_instagram_client
