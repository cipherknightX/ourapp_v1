# testing.md — V1 Testing Strategy

> Tests protect behavior, ownership, contracts, and failure handling. Coverage percentage is secondary.

## 1. Test Pyramid

```text
              E2E
          critical flows
        ─────────────────
        Integration tests
   DB / auth / webhook / jobs
  ───────────────────────────
          Unit tests
 validation / domain / parsing
```

## 2. Unit Tests

Prioritize deterministic logic:

- provider payload normalization;
- input validation;
- connection-state validation;
- SavedItem lifecycle rules;
- extraction schema/business validation;
- evidence conflict handling;
- search query normalization/ranking helpers;
- status/error mapping.

## 3. Integration Tests

Prioritize boundaries:

- FastAPI routes;
- Supabase/PostgreSQL persistence;
- authorization;
- RLS policies where testable in the environment;
- webhook verification/normalization;
- idempotent save creation;
- Redis/Celery job behavior;
- provider adapter behavior with mocked provider responses;
- AI structured-output validation.

Do not call paid/external AI or Meta services in ordinary unit tests.

## 4. Critical End-to-End Flow

```text
sign in
  ↓
connect Instagram identity
  ↓
receive normalized Reel event
  ↓
create SavedItem
  ↓
enqueue/process
  ↓
persist Understanding
  ↓
search library
  ↓
open SavedItem
```

External provider boundaries may be simulated in automated E2E tests where real provider automation is impractical.

## 5. Mandatory Authorization Tests

- User A cannot read User B's SavedItem.
- User A cannot update/delete User B's SavedItem.
- User A cannot read User B's Understanding.
- User A cannot access User B's processing jobs.
- User A cannot claim User B's ConnectedInstagram.
- Client-supplied `user_id` does not override authenticated identity.
- Privileged server paths still enforce application authorization.

## 6. Instagram Connection Tests

Cover:

```text
valid connection
expired state
invalid state
replayed/consumed state
unknown sender
already-connected provider identity
multiple Instagram accounts for one OurApp user
disconnect/reconnect behavior
```

## 7. Webhook Tests

Cover:

- valid event;
- invalid authenticity/signature where applicable;
- malformed payload;
- unsupported event;
- unknown sender;
- disconnected sender;
- duplicate provider event/message;
- missing/invalid source reference;
- provider retry behavior.

## 8. Idempotency Tests

At least verify:

```text
same provider event twice
    → one logical SavedItem

same job executed twice
    → no corrupted/duplicated Understanding
```

## 9. Media / SSRF Tests

Cover:

- invalid URL scheme;
- blocked internal/private network target;
- redirect abuse;
- oversized response;
- unsupported media;
- oversized media;
- timeout;
- cleanup after success;
- cleanup after terminal failure.

## 10. AI / Evidence Fixtures

Maintain synthetic/redacted fixtures for:

- recipe;
- place/travel Reel;
- product;
- book/movie/anime information;
- tutorial;
- meme/cute/cat/low-information Reel;
- edit/song content;
- misleading caption;
- irrelevant caption;
- conflicting OCR/transcript/caption;
- missing information.

Verify:

- caption does not override stronger evidence;
- unsupported facts remain unknown;
- malformed model output is rejected;
- structured output validates;
- low-information content does not get fabricated fields.

## 11. Search Tests

Verify:

- results are user-scoped;
- expected source metadata is searchable;
- extracted summary/entities are searchable;
- irrelevant users' data never appears;
- pagination/filter behavior is stable once implemented.

## 12. Failure / Retry Tests

Cover:

- transient provider failure → bounded retry;
- permanent failure → terminal state;
- AI validation failure;
- worker crash/retry;
- source unavailable;
- search indexing failure without SavedItem loss.

## 13. Regression Rule

When fixing a bug likely to recur, add a regression test that fails before the fix and passes after it when practical.

## 14. Test Data Rules

- Never commit production secrets.
- Never commit real private user messages/media as fixtures.
- Use synthetic or intentionally redacted fixtures.
- Keep fixtures small enough for fast tests.

## 15. CI Gate

The exact commands are finalized with the repo tooling, but the intended gate is:

```text
frontend lint/type/build/tests
            +
backend lint/type/tests
            +
security/dependency checks
            ↓
         mergeable
```

## 16. Definition of Tested

A feature is not "tested" because only the happy path works.

For security/ownership/provider work, include negative and failure-path tests.
