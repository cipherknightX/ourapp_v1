# techstack.md — Locked V1 Technology Stack

> Status: **Locked for V1**, subject to implementation-level refinement.
>
> Major substitutions require a documented decision and human approval.

## 1. Stack Summary

| Layer | Choice | Purpose |
|---|---|---|
| Frontend | React + TypeScript + Vite | Authenticated web app |
| Styling | Tailwind CSS | UI styling |
| Backend | Python + FastAPI | API, webhooks, orchestration |
| Validation | Pydantic | Typed boundary/structured-output validation |
| Database | PostgreSQL via Supabase | Relational persistence |
| Auth | Supabase Auth | Authentication/session foundation |
| DB security | PostgreSQL RLS | Defense-in-depth user isolation |
| Storage | Supabase Storage, intentionally limited | Small/derived assets or justified temporary needs |
| Queue | Redis | Celery broker / async coordination |
| Workers | Celery | Heavy background processing |
| Media pipeline | Python tooling | Temporary media/frame/audio processing |
| OCR | Python/provider abstraction | On-screen text extraction |
| STT | Provider abstraction | Spoken-audio transcription |
| AI/LLM | Provider-agnostic Python abstraction | Content understanding/extraction |
| Search V1 | PostgreSQL search/full-text capabilities | Initial library retrieval |
| Search later | pgvector | Semantic retrieval when justified |
| Local environment | Docker Compose | Reproducible development |
| CI | GitHub Actions | Automated validation |
| Backend tests | Pytest | Unit/integration tests |
| Frontend tests | Appropriate React/TS tooling | UI/unit/integration tests |
| Observability | Structured logs initially | Debugging/reliability; Sentry/OpenTelemetry later if justified |

## 2. Canonical Technology Diagram

```text
┌───────────────────────────────────────────┐
│                  FRONTEND                 │
│                                           │
│       React + TypeScript + Vite           │
│               Tailwind CSS                │
└───────────────────┬───────────────────────┘
                    │
                   API
                    │
┌───────────────────▼───────────────────────┐
│                 BACKEND                   │
│                                           │
│              FastAPI + Python             │
│                                           │
│   Auth / API / Webhooks / Orchestration   │
└───────┬───────────────────────┬───────────┘
        │                       │
        │                       ▼
        │                  ┌──────────┐
        │                  │  Redis   │
        │                  └────┬─────┘
        │                       │
        │                  ┌────▼─────┐
        │                  │  Celery  │
        │                  │  Workers │
        │                  └────┬─────┘
        │                       │
        │            ┌──────────┼──────────┐
        │            ▼          ▼          ▼
        │         Media       OCR      AI/LLM
        │       Processing   / STT     Providers
        │
        ▼
┌───────────────────────────────────────────┐
│                 SUPABASE                  │
│                                           │
│ PostgreSQL + Auth + Storage + RLS         │
│                                           │
│              + pgvector later             │
└───────────────────────────────────────────┘
```

Instagram/Meta is an external provider entering the FastAPI webhook boundary; see `architecture.md`.

## 3. Frontend — React + TypeScript + Vite

Why:

- OurApp is primarily an authenticated application.
- React/Vite is sufficient without adding Next.js complexity.
- TypeScript provides useful contracts for AI-generated and human-written frontend code.

Rules:

- Prefer strict TypeScript.
- Avoid `any` unless justified at an unavoidable external boundary; narrow it quickly.
- Keep API calls in service/client modules rather than scattering fetch logic through components.
- UI state is not authoritative security state.
- Components should remain presentation-focused.
- Shared API DTO types should match defined backend contracts rather than raw database rows.

## 4. Styling — Tailwind CSS

Rules:

- Use consistent design tokens/conventions once established.
- Prefer reusable components over repeated long class patterns when repetition becomes meaningful.
- Do not add a second styling system without a decision.
- Accessibility and responsive behavior are part of component quality.

## 5. Backend — Python + FastAPI

FastAPI owns:

```text
API routes
webhook routes
auth context
request/response validation
application orchestration
queue submission
safe error mapping
```

Rules:

- Use Pydantic models at external/structured boundaries.
- Keep route handlers thin.
- Do not perform heavy OCR/STT/AI/media processing in request handlers.
- Provider-specific SDK calls belong in integration modules.
- Domain/application services should not depend directly on FastAPI request objects when avoidable.

## 6. Python Conventions

- `snake_case`: functions, variables, modules.
- `PascalCase`: classes/Pydantic models.
- `UPPER_SNAKE_CASE`: constants.
- Type annotate public/service boundaries.
- Prefer explicit domain types/models over long-lived arbitrary dictionaries.
- Avoid circular imports by respecting module boundaries.
- Keep side effects at explicit integration/orchestration boundaries.

Exact formatter/linter/type-checker tooling can be selected during repo bootstrap and then recorded here; do not invent multiple overlapping tools.

## 7. Supabase PostgreSQL

Use PostgreSQL as the persistent source of truth for:

- application user/profile relationship;
- connected Instagram identities;
- pending connection state if implemented in DB;
- SavedItems;
- processing state;
- evidence metadata/retained evidence;
- Understanding;
- search/indexed data.

Why:

- relational ownership fits the domain;
- PostgreSQL constraints/indexes/RLS are useful;
- Supabase bundles managed PostgreSQL, Auth, and Storage.

Do not couple domain logic to Supabase-specific client behavior when normal PostgreSQL/repository boundaries are sufficient.

## 8. Supabase Auth

Do not build custom authentication for V1.

Rules:

- backend validates the authenticated context for protected API calls;
- authorization remains OurApp responsibility;
- frontend never receives privileged service-role credentials;
- exact session/token integration is finalized during auth implementation and then documented.

## 9. RLS

RLS protects exposed user-owned tables as defense-in-depth.

Conceptually:

```text
authenticated Supabase identity
       ↓
user-owned row policy
```

RLS must be tested. Do not assume enabling it automatically makes policies correct.

## 10. Supabase Storage

Storage is **not** the permanent home for every Reel.

Allowed/likely uses:

- small derived assets such as thumbnails if justified;
- temporary/processing artifacts only when a storage-backed workflow is actually useful;
- future product assets explicitly approved.

Default raw Reel lifecycle remains temporary local/worker processing followed by cleanup.

## 11. Redis + Celery

Architecture:

```text
FastAPI
   ↓ enqueue
Redis
   ↓
Celery worker
   ↓
processing
```

Rules:

- tasks use IDs/small payloads;
- retries are bounded;
- tasks are idempotent where duplicate execution is possible;
- task state/failure is persisted appropriately;
- do not use Celery as an excuse to create dozens of microscopic tasks before needed.

Potential processing stages:

```text
acquire media
extract frames/audio
transcribe
OCR
build evidence
understand content
validate
persist/index
cleanup
```

Whether these are one or several tasks is an implementation decision based on reliability/observability needs.

## 12. AI Provider Abstraction

Domain code must not be littered with vendor SDK calls.

```text
UnderstandingService
       ↓
UnderstandingProvider
       ├── provider A
       ├── provider B
       └── future/local provider
```

This supports:

- model/provider replacement;
- cost optimization;
- routing simple vs complex content;
- provider outages;
- future local models.

Do not choose or add a specific model/provider to the locked stack until we actually select it for implementation.

## 13. OCR / STT

OCR and transcription are part of the Python processing layer.

The exact library/provider is intentionally **not locked yet** because we have not selected one.

Requirements:

- provider/tool is isolated behind a small interface where useful;
- output is evidence, not unquestioned truth;
- cost and latency are considered;
- media is temporary.

## 14. Search

### V1

Use PostgreSQL search/full-text capabilities.

Searchable fields can include:

```text
creator/source metadata
caption
summary
entities
structured extraction
retained OCR/transcript
```

### Later

Use `pgvector` when semantic search is proven useful.

Do not add Elasticsearch or a separate vector database in V1.

## 15. Docker Compose

Local development should be reproducible.

Conceptual local services:

```text
frontend
backend
worker
redis
```

Supabase may remain managed externally during early development. Local Supabase can be introduced later if it materially improves development/testing.

## 16. GitHub Actions

Intended CI pipeline:

```text
checkout/install
      ↓
lint / format validation
      ↓
type/build checks
      ↓
backend tests
      ↓
frontend tests
      ↓
security/dependency checks
```

Exact commands are added once repo tooling is selected.

## 17. Observability

Start simple:

- structured application logs;
- request/correlation IDs where useful;
- job IDs and safe error categories;
- processing-state visibility.

Sentry/OpenTelemetry may be added when the product has enough usage/complexity to justify them. They are not required to begin V1.

## 18. Cost Architecture

The system is intentionally designed to avoid raw-media storage cost.

```text
source link/reference
       ↓
temporary processing
       ↓
compact metadata + Understanding
```

Likely cost drivers to watch:

```text
AI inference
media processing
external APIs
worker compute
database size
egress
small asset storage
```

Supabase Free has usage limits and is suitable for early development/testing, but the architecture must not assume any third-party free tier is unlimited or permanent. Verify current provider quotas/pricing when deployment decisions depend on them.

## 19. Explicitly Not Chosen for V1

- Next.js.
- Node as the primary backend.
- MongoDB as the primary database.
- Firebase as the primary backend.
- Custom authentication.
- Kubernetes.
- Kafka.
- Microservice decomposition.
- Elasticsearch.
- Separate vector database.
- Permanent raw Reel storage.
- A hard-coded single AI vendor throughout domain code.

These are scope/architecture choices, not claims that the technologies are universally bad.

## 20. Stack Change Procedure

Changing a major technology requires:

1. problem/constraint;
2. proposed replacement;
3. alternatives;
4. migration impact;
5. security impact;
6. cost/operational impact;
7. accepted human decision;
8. `decisions.md` entry;
9. updates to architecture/contracts/flow as applicable.
