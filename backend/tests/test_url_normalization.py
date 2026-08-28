from app.schemas.instagram import NormalizedInstagramEvent
from app.services.instagram_service import (
    extract_media_from_event,
    is_canonical_instagram_url,
    is_meta_cdn_asset_url,
)


def test_is_canonical_instagram_url() -> None:
    # Valid Reel and Post URLs
    assert is_canonical_instagram_url("https://www.instagram.com/reel/DbNDrILKle_/")
    assert is_canonical_instagram_url("http://instagram.com/reels/DbNDrILKle_")
    assert is_canonical_instagram_url("https://instagram.com/p/C123abc456/")
    assert is_canonical_instagram_url("https://www.instagram.com/p/C123abc456")
    assert is_canonical_instagram_url("https://www.instagram.com/tv/C123abc456")

    # Invalid / CDN / Unrelated URLs
    assert not is_canonical_instagram_url(
        "https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=123"
    )
    assert not is_canonical_instagram_url(
        "https://scontent.cdninstagram.com/v/t51.2885-15/e35/123.jpg"
    )
    assert not is_canonical_instagram_url("https://youtube.com/watch?v=123")
    assert not is_canonical_instagram_url("")
    assert not is_canonical_instagram_url(None)


def test_is_meta_cdn_asset_url() -> None:
    assert is_meta_cdn_asset_url(
        "https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=123"
    )
    assert is_meta_cdn_asset_url(
        "https://scontent.cdninstagram.com/v/t51.2885-15/e35/123.jpg"
    )
    assert is_meta_cdn_asset_url("https://fbcdn.net/v/123")

    assert not is_meta_cdn_asset_url("https://www.instagram.com/reel/DbNDrILKle_/")
    assert not is_meta_cdn_asset_url("https://www.instagram.com/p/C123abc456/")
    assert not is_meta_cdn_asset_url(None)


def test_extract_media_from_canonical_reel_attachment_unchanged() -> None:
    """A.

    Existing ig_reel fixture continues to produce exactly the same
    SavedItem/source_url.
    """
    event = NormalizedInstagramEvent(
        provider_event_id="evt_reel_1",
        sender_id="ig_sender_1",
        recipient_id="ig_bot_1",
        timestamp=1234567890,
        message_id="mid_reel_1",
        text=None,
        attachments=[
            {
                "type": "ig_reel",
                "payload": {
                    "url": "https://www.instagram.com/reel/DbNDrILKle_/",
                    "title": "Amazing Tuscan Recipe",
                },
            }
        ],
        raw_payload={},
    )

    url, item_id, caption, thumb = extract_media_from_event(event)
    assert url == "https://www.instagram.com/reel/DbNDrILKle_/"
    assert item_id == "DbNDrILKle_"
    assert caption == "Amazing Tuscan Recipe"
    assert thumb is None


def test_extract_media_from_canonical_static_post_attachment() -> None:
    """C.

    Static/image post gets a canonical Instagram URL if Meta provides one
    through the supported data.
    """
    event = NormalizedInstagramEvent(
        provider_event_id="evt_post_1",
        sender_id="ig_sender_1",
        recipient_id="ig_bot_1",
        timestamp=1234567890,
        message_id="mid_post_1",
        text=None,
        attachments=[
            {
                "type": "share",
                "payload": {
                    "url": "https://www.instagram.com/p/C987654321/",
                    "title": "Beautiful Sunset Photography",
                },
            }
        ],
        raw_payload={},
    )

    url, item_id, caption, thumb = extract_media_from_event(event)
    assert url == "https://www.instagram.com/p/C987654321/"
    assert item_id == "C987654321"
    assert caption == "Beautiful Sunset Photography"


def test_extract_media_rejects_meta_cdn_attachment_as_canonical_source_url() -> None:
    """D.

    Meta CDN URLs are never stored as canonical source_url.
    """
    event = NormalizedInstagramEvent(
        provider_event_id="evt_cdn_1",
        sender_id="ig_sender_1",
        recipient_id="ig_bot_1",
        timestamp=1234567890,
        message_id="mid_cdn_1",
        text=None,
        attachments=[
            {
                "type": "image",
                "payload": {
                    "id": "asset_987654321",
                    "url": "https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=987654321",
                },
            }
        ],
        raw_payload={},
    )

    url, item_id, caption, thumb = extract_media_from_event(event)
    # CDN URL is rejected as source_url
    assert url is None
    assert item_id == "asset_987654321"


def test_extract_media_from_message_text() -> None:
    event = NormalizedInstagramEvent(
        provider_event_id="evt_text_1",
        sender_id="ig_sender_1",
        recipient_id="ig_bot_1",
        timestamp=1234567890,
        message_id="mid_text_1",
        text="Check this out https://www.instagram.com/reel/XYZ123_456/ it is great",
        attachments=[],
        raw_payload={},
    )

    url, item_id, caption, thumb = extract_media_from_event(event)
    assert url == "https://www.instagram.com/reel/XYZ123_456/"
    assert item_id == "XYZ123_456"
    assert (
        caption
        == "Check this out https://www.instagram.com/reel/XYZ123_456/ it is great"
    )
