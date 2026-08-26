# contracts.md — Shared System Contracts

> Contracts are interfaces that multiple modules depend on. Agents must treat them as compatibility boundaries.
>
> Field names below are **conceptual until implemented**. Once concrete schemas exist, replace conceptual examples with exact types/module references.

## 1. Contract Change Procedure

Before changing a shared contract:

```text
identify producer(s)
      ↓
identify consumer(s)
      ↓
assess compatibility/migration
      ↓
change producer + consumers
      ↓
tests
      ↓
update this file
      ↓
update flow/database/decision docs if applicable
```

Never silently change field meaning.

## 2. Identity Contract

### OurApp User

A stable internal user identity (`UUID`) anchors all resource ownership:

```text
UserContext (Internal Backend Authenticated Context):
    user_id: UUID
    email: str | None
    role: str | None

UserRead (Client API DTO for /api/v1/auth/me):
    id: UUID
    email: str | None
```

The verified JWT `sub` claim is the sole authoritative identity key.

### Instagram Identity

Use a stable provider-scoped identifier for account mapping:

```text
ConnectedInstagram
    user_id
    instagram_scoped_id   ← identity
    display_username      ← mutable display metadata
```

Do not use username as the sole permanent key.

## 3. Pending Instagram Connection Contract

Conceptual state:

```text
id
user_id
connection_token/state
status
expires_at
consumed_at
created_at
```

Requirements:

- unguessable enough for its purpose;
- scoped to one OurApp user;
- expires;
- single-use where appropriate;
- replay-safe.

The exact DM/deep-link mechanics depend on the supported Meta implementation and must be verified during integration work.

## 4. Normalized Instagram Event

Raw Meta payloads should be converted into an internal event before application/domain logic.

Conceptual:

```text
provider_event_id
provider_message_id
sender_provider_id
event_type
shared_source_reference
received_at
provider_metadata_reference
```

Requirements:

- enough stable identity for idempotency;
- no dependency on mutable display username;
- raw provider shape does not leak through the whole application.

## 5. SavedItem Contract

Conceptual:

```text
id
user_id
platform
source_reference
provider_item_reference
creator_metadata
caption
thumbnail_reference
status
created_at
updated_at
```

### Invariants

- exactly one authoritative owner;
- source/reference survives extraction failure;
- permanent raw video is not required;
- source and Understanding are separate.

## 6. ProcessingJob Contract

Conceptual:

```text
id
saved_item_id
job_type
status
attempt_count
error_code
analysis_version
created_at
started_at
finished_at
```

Possible status semantics:

```text
queued
processing
ready
failed
```

Exact enums should be centralized once implemented.

### Requirements

- duplicate execution is safe;
- retry count is bounded;
- user-facing errors use safe categories;
- raw exceptions/secrets are not exposed.

## 7. Evidence Contract

Evidence remains distinguishable by origin.

Conceptual:

```text
saved_item_id
visual_evidence
transcript
ocr_text
caption
hashtags
provider_metadata
evidence_references
```

Do not collapse all evidence into one unlabeled text blob if provenance is needed for validation.

## 8. Understanding Contract

Conceptual:

```text
id
saved_item_id
analysis_version
content_type
summary
structured_content
evidence/confidence_metadata
model_provider
model_identifier
created_at
updated_at
```

### Requirements

- structured output is validated before persistence;
- content-specific fields may be optional;
- unsupported facts remain unknown;
- analysis version supports future reprocessing;
- provider response objects are not persisted as the domain contract unless explicitly justified.

## 9. API Authentication Contract

Protected API operations must derive authenticated identity from the server-validated session/token context.

Never accept this pattern as authorization:

```text
client says user_id = X
→ server trusts X
```

Instead:

```text
validated auth identity
→ server resolves authoritative user
→ server scopes resource operation
```

## 10. API Response Contract

Return only fields needed by the frontend.

Do not expose:

- privileged credentials;
- internal secrets;
- raw stack traces;
- unnecessary provider payloads;
- internal-only database fields;
- another user's data.

## 11. Error Contract

Use consistent safe categories such as:

```text
VALIDATION_ERROR
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
PROVIDER_ERROR
PROCESSING_ERROR
INTERNAL_ERROR
```

Concrete HTTP/status mapping should be centralized once implemented.

## 12. Search Contract

Input:

```text
authenticated_user
query
optional filters
pagination
```

Output:

```text
user-owned SavedItem result(s)
source/display metadata
processing/understanding summary needed by UI
ranking/pagination metadata
```

Search must never rely on the client to filter out other users.

## 13. Frontend / Backend DTO Contract

The frontend consumes API DTOs, not raw database rows.

This allows database/internal schemas to evolve without exposing every persistence field.

## 14. AI Provider Contract

Conceptual internal interface:

```text
analyze(evidence, requested_schema/context)
    → validated/validatable provider-neutral result
```

Provider-specific SDK objects stop inside the integration implementation.

## 15. Storage Contract

V1 persistence stores:

```text
source reference
metadata
derived understanding
searchable data
small/derived assets when justified
```

Temporary raw media is not a permanent storage contract.

## 16. Versioning Rule

A breaking contract change requires an explicit compatibility/migration plan.

Breaking examples:

- field renamed or removed;
- identifier meaning changed;
- optional field becomes required;
- type/enum semantics change;
- ownership semantics change;
- error behavior relied on by clients changes.
