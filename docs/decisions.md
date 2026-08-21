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
