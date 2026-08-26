# database.md — V1 Data Model & Persistence Rules

> PostgreSQL via Supabase is the V1 source of truth.
>
> This file defines conceptual entities and invariants. Actual migrations are authoritative once created and must remain synchronized with this document.

---
> **Invariant:** Raw Reel media is temporary by default and must not be permanently stored in V1.

## 1. Relationship Diagram

```text
┌──────────┐
│   User   │
└────┬─────┘
     │ 1
     ├───────────────< ConnectedInstagram
     │
     └───────────────< SavedItem
                           │ 1
                           ├────────< ProcessingJob
                           ├────────< Evidence
                           └────────< Understanding
```

---

## 2. User (`public.users`)

Purpose: application ownership root.

Schema (`supabase/migrations/20260826000000_create_users_foundation.sql`):

```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Creation & RLS Rules:
- Created strictly via `SECURITY DEFINER` trigger `handle_new_user()` on `auth.users AFTER INSERT`.
- RLS enabled:
  - `users_select_own`: `FOR SELECT USING (auth.uid() = id)`
  - `users_update_own`: `FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`
  - Client direct `INSERT` and `DELETE` are forbidden.
- Authoritative identifier: `id` (matching `auth.users.id` / JWT `sub`).
- Client cannot override ownership.

---

## 3. ConnectedInstagram

Purpose: map an Instagram sender identity to an OurApp user.

Conceptual fields:

```text
id
user_id
instagram_scoped_id
display_username
status
connected_at
disconnected_at
created_at
updated_at
```

Invariants:
- stable provider ID is authoritative;
- username is mutable display/cache metadata;
- a provider identity must not silently belong to multiple active users;
- one OurApp user may connect multiple Instagram accounts.

Useful indexes/constraints should follow real access patterns once migrations are designed.

---

## 4. SavedItem

Purpose: durable record of the user's save.

Conceptual fields:

```text
id
user_id
platform
source_reference
provider_item_reference
creator_metadata
caption
thumbnail_reference
processing_status
created_at
updated_at
```

Invariants:
- one authoritative owner;
- persists before expensive processing;
- survives processing failure;
- does not contain a permanent raw video by default.

---

## 5. ProcessingJob

Purpose: durable processing/audit state.

Conceptual fields:

```text
id
saved_item_id
job_type
status
attempt_count
error_code
created_at
started_at
finished_at
```

Rules:
- support bounded retry;
- safe error codes rather than sensitive raw exceptions;
- index based on actual worker/status query patterns.

---

## 6. Evidence

Purpose: retain useful evidence/provenance needed to explain/search/reprocess an understanding.

Potential categories:

```text
visual
transcript
ocr
caption
metadata
```

Rules:
- preserve provenance;
- retain only what is useful/allowed;
- raw media remains temporary by default;
- avoid duplicating huge text/media without purpose.

Whether Evidence becomes one table, multiple tables, or structured JSON is an implementation decision to make when the schema is designed.

---

## 7. Understanding

Purpose: validated derived memory.

Conceptual fields:

```text
id
saved_item_id
analysis_version
content_type
summary
structured_content
confidence_metadata
model_metadata
created_at
updated_at
```

Rules:
- derived, not authoritative source;
- validated before persistence;
- versioned enough to support future re-analysis;
- content-specific structured data is allowed.

---

## 8. Search Representation

Search may index:
- source metadata;
- captions;
- summary;
- extracted entities;
- structured content;
- retained transcript/OCR.

```text
SavedItem + Understanding
          │
          ▼
PostgreSQL searchable representation
```

Search data remains derived state.

---

## 9. RLS / Ownership

For exposed user-owned tables, design RLS around the authenticated user's stable ID.

Conceptually:

```text
User A ──► rows owned by User A
User B ──► rows owned by User B

User A ──X─► User B rows
```

RLS is defense in depth; backend authorization is still required.

Service-role access must not be treated as proof of user authorization.

---

## 10. Migration Rules

Every schema change must consider:
- forward migration;
- existing data;
- nullability;
- uniqueness;
- foreign keys;
- indexes;
- deletion/cascade behavior;
- rollback/recovery;
- compatibility with running code;
- RLS policy updates.

Never edit production schema manually and forget to create/update migrations.

---

## 11. Transactions & Integrity

Use database constraints for invariants that must always hold.

Use transactions when several writes form one logical operation.

Examples:
- connection activation + state consumption;
- save/job creation when atomicity is required;
- version replacement where partial writes would corrupt state.

---

## 12. Deletion & Retention

Deletion behavior must eventually define:
- user account deletion;
- Instagram disconnect;
- SavedItem deletion;
- Understanding/evidence deletion;
- temporary media cleanup.

Do not invent permanent retention policies without a product/privacy decision.

---

## 13. Explicit Non-Model

Do not add a default permanent raw-media/video table/blob field for V1.

```text
BAD DEFAULT:
SavedItem → video_blob/video_file forever

V1 DEFAULT:
SavedItem → source_reference + compact derived memory
```
