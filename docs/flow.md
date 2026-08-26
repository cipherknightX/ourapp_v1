# flow.md — Runtime Execution & Data Flows

> This file answers: **what happens, in what order, and across which boundaries?**
>
> Update it when execution order, async boundaries, retry behavior, or material call paths change.

## 1. End-to-End V1 Flow

```text
User creates/signs into OurApp
        ↓
User starts Instagram connection
        ↓
User sends connection message to @OurApp
        ↓
Meta webhook reaches FastAPI
        ↓
Instagram adapter verifies + normalizes event
        ↓
connection state resolves OurApp user
        ↓
ConnectedInstagram persisted
        ↓
User later DMs a Reel/post
        ↓
Meta webhook
        ↓
verify → validate → deduplicate
        ↓
resolve Instagram sender → OurApp user
        ↓
create SavedItem/source reference
        ↓
create/enqueue ProcessingJob
        ↓
respond quickly to webhook
        ↓
Celery worker
        ↓
retrieve media/evidence temporarily if needed
        ↓
OCR + transcription + visual analysis
        ↓
evidence fusion
        ↓
AI understanding
        ↓
schema/business/evidence validation
        ↓
persist Understanding + searchable fields
        ↓
cleanup temporary media
        ↓
library/search shows saved source + extracted information
```

## 2. Sign-In / App Session Flow

```text
React UI (LoginPage / SignupPage)
   ↓ calls supabase.auth.signInWithPassword / signUp
Supabase Auth
   ↓ returns session { access_token (JWT), user }
Browser AuthContext stores session & restores via onAuthStateChange
   ↓ attaches Authorization: Bearer <access_token>
FastAPI Protected Route (e.g. GET /api/v1/auth/me)
   ↓ get_current_user dependency
JWKS Public Key Verification (PyJWKClient against /.well-known/jwks.json)
   ↓ validates signature, exp, iss, aud="authenticated", sub UUID
Authoritative UserContext(user_id=sub, email=...)
   ↓ protected resource execution
Response (UserRead DTO)
```

Authorization is derived strictly from the verified JWT `sub` UUID; client-supplied identifiers in request bodies or query parameters are ignored.


## 3. Instagram Connection Flow

Conceptual flow:

```text
Authenticated OurApp user
        ↓
"Connect Instagram"
        ↓
backend creates pending connection state
        ↓
UI opens @OurApp Instagram DM
        ↓
user sends the connection message/state
        ↓
Meta sends webhook
        ↓
verify webhook
        ↓
parse stable sender provider ID
        ↓
validate/consume pending connection state
        ↓
associate ConnectedInstagram with OurApp user
        ↓
connection state becomes used/expired
        ↓
UI can display connected account
```

### Connection invariants

- One connection message must not be replayable indefinitely.
- Mutable Instagram username is not the identity key.
- A provider identity cannot silently be claimed by two OurApp users.
- Multiple Instagram accounts may map to one OurApp account.

## 4. Reel Save Fast Path

```text
Instagram user
    ↓ sends Reel/post to @OurApp
Meta webhook
    ↓
FastAPI webhook route
    ↓
verify provider authenticity
    ↓
validate event shape
    ↓
deduplicate provider event/message
    ↓
Instagram adapter normalizes event
    ↓
resolve ConnectedInstagram
    ↓
resolve OurApp user
    ↓
extract/normalize source reference
    ↓
create SavedItem
    ↓
create/enqueue ProcessingJob
    ↓
return provider response
```

The fast path does not run expensive OCR/STT/AI.

## 5. Processing Flow

```text
Celery receives job
      ↓
load SavedItem
      ↓
check job/item state + idempotency
      ↓
determine required evidence
      ↓
temporarily retrieve media if necessary
      ↓
validate media
      ↓
┌──────────────────────────────────┐
│ evidence collection              │
│                                  │
│ frames / visual analysis         │
│ audio → transcript               │
│ frames → OCR                     │
│ caption / hashtags / metadata    │
└────────────────┬─────────────────┘
                 ↓
          evidence fusion
                 ↓
         classify content
                 ↓
       structured extraction
                 ↓
        Pydantic validation
                 ↓
 evidence/business validation
                 ↓
      persist Understanding
                 ↓
       update searchable data
                 ↓
         mark job READY
                 ↓
       cleanup temp media
```

The exact number of Celery tasks may evolve. Do not split this into many services merely to mirror each box.

## 6. Low-Information / Entertainment Save

Some content is saved because it is enjoyable rather than informational.

```text
Saved Reel
   ↓
processing determines little/no useful structured extraction
   ↓
preserve source + useful lightweight metadata/summary
   ↓
UI does not force a giant extraction panel
```

The product should not manufacture information merely to fill fields.

## 7. Saved Item Detail Flow

```text
User opens SavedItem
      ↓
React requests item
      ↓
FastAPI authenticates + authorizes owner
      ↓
load source metadata + processing state + Understanding
      ↓
return minimal client DTO
      ↓
UI presents:
    source link/embed/reference
    +
    extracted information when available/useful
```

The original source and extracted understanding are conceptually separate views of the same memory.

## 8. Search Flow

```text
User query
    ↓
FastAPI authentication
    ↓
authorize user library scope
    ↓
normalize query
    ↓
PostgreSQL search across permitted source/derived fields
    ↓
rank/filter
    ↓
return only user's SavedItems
```

Later, when justified:

```text
keyword search
      +
pgvector semantic retrieval
      ↓
combined ranking
```

No separate vector/search service in V1.

## 9. Re-Analysis Flow

```text
User requests re-analysis
      ↓
authenticate + authorize SavedItem
      ↓
check limits/current state
      ↓
create new ProcessingJob / analysis version
      ↓
worker reprocesses
      ↓
validate new Understanding
      ↓
persist new version/update active result
```

Re-analysis never deletes the SavedItem itself.

## 10. Processing Failure Flow

```text
step fails
   ↓
classify error
   ├── retryable provider/network/transient error
   │        ↓
   │   bounded retry
   │
   └── permanent/validation error
            ↓
       terminal failure state
            ↓
SavedItem remains intact
```

Cleanup of temporary media should occur in terminal paths as well.

## 11. Duplicate Event Flow

```text
Meta retries same event
       ↓
webhook receives same stable event/message identity
       ↓
idempotency/deduplication check
       ↓
existing durable result found
       ↓
do not create duplicate SavedItem/job
       ↓
return safe response
```

## 12. Temporary Media Lifecycle

```text
source reference
    ↓
worker retrieval
    ↓
restricted temporary location
    ↓
media validation
    ↓
processing
    ↓
derived evidence/understanding persisted
    ↓
temporary file deletion
```

Temporary raw media must not silently become permanent storage.

## 13. Security Boundary Flow

At external boundaries:

```text
external input
    ↓
authenticity/authentication
    ↓
schema validation
    ↓
authorization/ownership
    ↓
normalization
    ↓
business logic
    ↓
persistence
```

Not every boundary uses every step; for example, a Meta webhook uses provider authenticity rather than a user session.

## 14. Documentation Rule

When implementation changes a flow above, update:

- actual module/function names once they exist;
- sync/async boundary;
- state transitions;
- retry/failure path;
- persistence points;
- temporary-media lifecycle.

Do not let this file remain a purely conceptual diagram after concrete implementation exists.
