# decisions.md — Architecture & Engineering Decision Log

> This is an append-only reasoning record for decisions future humans/agents may otherwise accidentally reverse.
>
> Do not log trivial implementation details. Do not rewrite old accepted decisions; supersede them with a new entry.

## Status Values

- `Proposed`
- `Accepted`
- `Superseded`
- `Rejected`

## Decision Template

```markdown
## DEC-XXXX — Short title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded | Rejected
Scope: product | architecture | security | data | integration | cost | tooling

### Context
What problem/constraint existed?

### Decision
What did we choose?

### Reasoning
Why?

### Alternatives considered
- Option A — reason rejected
- Option B — reason rejected

### Consequences
What becomes easier/harder/cheaper/riskier?

### Security / privacy impact
Relevant implications.

### Reversal conditions
What evidence would justify reconsidering?

### Affected docs/modules
- ...
```

## Decision Index

| ID | Decision | Status |
|---|---|---|
| DEC-0001 | Instagram-only ingestion for V1 | Accepted |
| DEC-0002 | Locked V1 application stack | Accepted |
| DEC-0003 | No permanent raw Reel storage by default | Accepted |
| DEC-0004 | Heavy processing uses Redis + Celery workers | Accepted |
| DEC-0005 | Provider integrations use adapters | Accepted |
| DEC-0006 | PostgreSQL search first; pgvector later if justified | Accepted |
| DEC-0007 | Supabase JWKS asymmetric JWT verification | Accepted |
| DEC-0008 | Trigger-driven user identity and scoped RLS | Accepted |

---

## DEC-0001 — Instagram-only ingestion for V1

Date: 2026-08-21  
Status: Accepted  
Scope: product

### Context

Supporting Instagram and YouTube simultaneously increases integration work before the core memory workflow is proven.

### Decision

V1 ingests Instagram only. YouTube is a later source adapter.

### Reasoning

Master one high-value workflow first while keeping the normalized core extensible.

### Consequences

Instagram/Meta integration receives full attention. The core pipeline must not become Instagram-specific beyond the adapter boundary.

### Reversal conditions

Instagram V1 is working and the core ingestion/processing/search workflow is stable enough to add another source.

---

## DEC-0002 — Locked V1 application stack

Date: 2026-08-21  
Status: Accepted  
Scope: architecture/tooling

### Decision

Use:

```text
React + TypeScript + Vite + Tailwind
FastAPI + Python + Pydantic
Supabase PostgreSQL + Auth + RLS + limited Storage
Redis + Celery
PostgreSQL search
Docker Compose
GitHub Actions
Pytest + frontend test tooling
```

AI/OCR/STT providers remain abstract until individually selected.

### Reasoning

This stack matches the authenticated web UI, Python-heavy media/AI pipeline, relational ownership model, asynchronous processing, and desire to avoid unnecessary infrastructure.

### Consequences

Agents must follow technology-specific rules in `techstack.md`. Major substitutions require a new decision.

---

## DEC-0003 — No permanent raw Reel storage by default

Date: 2026-08-21  
Status: Accepted  
Scope: architecture/cost/data

### Context

Permanent storage of every Reel would add unnecessary storage, egress, lifecycle, and operational cost. The product's value is the saved memory and understanding, not hosting copied video.

### Decision

Persist the source/reference, metadata, and derived Understanding. Retrieve raw media temporarily when processing requires it, then clean it up.

### Consequences

SavedItems must not depend on a permanent internal video file. UI revisits the source through supported platform links/embeds/references where possible.

### Reversal conditions

A future product requirement explicitly needs retained media and its legal, technical, privacy, and cost implications are accepted.

---

## DEC-0004 — Heavy processing uses Redis + Celery workers

Date: 2026-08-21  
Status: Accepted  
Scope: architecture

### Context

OCR, transcription, media processing, and AI can be slow/retryable and should not block webhook/API requests.

### Decision

FastAPI persists/enqueues quickly; Redis brokers jobs; Celery workers perform heavy processing.

### Consequences

Job idempotency, bounded retries, status persistence, and worker observability become required engineering concerns.

---

## DEC-0005 — Provider integrations use adapters

Date: 2026-08-21  
Status: Accepted  
Scope: architecture/integration

### Decision

Meta/Instagram payloads and AI vendor SDK responses are normalized behind integration/provider boundaries before domain logic.

### Reasoning

This prevents vendor shapes from spreading through the application and makes future YouTube/model-provider additions safer.

### Consequences

Agents must not scatter provider SDK calls throughout domain/services/UI.

---

## DEC-0006 — PostgreSQL search first; pgvector later if justified

Date: 2026-08-21  
Status: Accepted  
Scope: architecture/cost

### Decision

Use PostgreSQL search/full-text capabilities for V1. Add `pgvector` later if semantic retrieval demonstrates value.

### Reasoning

Avoid Elasticsearch/separate vector infrastructure before real search requirements exist.

### Consequences

Initial schema/search design should support useful keyword/structured retrieval without assuming a vector service.

---

## DEC-0007 — Supabase JWKS asymmetric JWT verification

Date: 2026-08-26  
Status: Accepted  
Scope: architecture/security/auth

### Context

Protected backend endpoints must verify user identity without trusting client-supplied identifiers or sharing symmetric server secrets unnecessarily.

### Decision

Use Supabase JWKS (`/.well-known/jwks.json`) via `PyJWKClient` to verify asymmetric JWT signatures (RS256/ES256) and validate `exp`, `iss`, `aud` (`authenticated`), and `sub` (UUID).

### Reasoning

- Public key verification removes the need to distribute `SUPABASE_SECRET_KEY` or symmetric JWT secrets to the API server when not needed.
- Asymmetric keys support key rotation seamlessly.
- Strict claim validation guarantees that only valid authenticated sessions issued by the Supabase project can access protected endpoints.

### Consequences

FastAPI routes derive identity via the `get_current_user` dependency. Verified `sub` UUID is the sole authoritative ownership key.

---

## DEC-0008 — Trigger-driven user identity and scoped RLS

Date: 2026-08-26  
Status: Accepted  
Scope: architecture/data/security

### Context

The application needs an application-level `public.users` entity linked to `auth.users` with strict Row Level Security.

### Decision

Create `public.users` via a `SECURITY DEFINER` trigger `on_auth_user_created` (`SET search_path = ''`) upon `auth.users` insert. RLS grants `SELECT` and `UPDATE` only for `auth.uid() = id`.

### Reasoning

- Prevents client-side spoofing or manual creation of user rows.
- Hardens the trigger against schema injection.
- Enforces user isolation at both database (RLS) and API layers.

### Consequences

Application records link to `public.users(id)`. Direct client `INSERT` and `DELETE` on `public.users` are omitted.

