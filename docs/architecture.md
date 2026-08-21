# architecture.md — Canonical V1 Architecture

> This file describes **what components exist, their responsibilities, and which direction dependencies should flow**.
>
> Runtime sequencing belongs in `flow.md`. Shared payload/interface definitions belong in `contracts.md`.

## 1. Canonical V1 Architecture Diagram

```text
                         ┌───────────────────────────┐
                         │     INSTAGRAM / META      │
                         │                           │
                         │ DM events / webhooks /    │
                         │ source references         │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│                                                             │
│              React + TypeScript + Vite                      │
│                     Tailwind CSS                            │
│                                                             │
│   Library / Search / Saved Item / Connection / Account UI   │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS API
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                          BACKEND                            │
│                                                             │
│                    FastAPI + Python                         │
│                                                             │
│       Auth boundary / API / Webhooks / Orchestration        │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                │ durable data                  │ enqueue jobs
                ▼                               ▼
┌───────────────────────────────┐        ┌───────────────┐
│           SUPABASE            │        │     REDIS     │
│                               │        │               │
│ PostgreSQL + Auth + RLS       │        │ job broker    │
│ Storage (limited/intentional) │        └───────┬───────┘
│ pgvector later                │                │
└───────────────▲───────────────┘                ▼
                │                       ┌─────────────────┐
                │ results/state         │ CELERY WORKERS  │
                │                       └────────┬────────┘
                │                                │
                │                  ┌─────────────┼─────────────┐
                │                  ▼             ▼             ▼
                │              ┌────────┐   ┌─────────┐   ┌──────────┐
                │              │ Media  │   │ OCR/STT │   │ AI / LLM │
                │              │Process │   │         │   │Providers │
                │              └────┬───┘   └────┬────┘   └────┬─────┘
                │                   └─────────────┼──────────────┘
                │                                 ▼
                │                       Evidence + Understanding
                └─────────────────────────────────┘
```

The frontend does **not** receive Instagram events directly. Meta/Instagram events enter through the backend webhook boundary.

## 2. Simplified Technology View

```text
┌───────────────────────────────────────────┐
│                  FRONTEND                 │
│       React + TypeScript + Vite           │
│               Tailwind CSS                │
└───────────────────┬───────────────────────┘
                    │ API
┌───────────────────▼───────────────────────┐
│                 BACKEND                   │
│              FastAPI + Python             │
│   Auth / API / Webhooks / Orchestration   │
└───────┬───────────────────────┬───────────┘
        │                       ▼
        │                    Redis
        │                       │
        │                    Celery
        │                       │
        │            ┌──────────┼──────────┐
        │            ▼          ▼          ▼
        │          Media      OCR/STT    AI/LLM
        │        Processing             Providers
        ▼
┌───────────────────────────────────────────┐
│                 SUPABASE                  │
│ PostgreSQL + Auth + Storage + RLS         │
│              + pgvector later             │
└───────────────────────────────────────────┘
```

## 3. Architectural Style

V1 is a **modular application plus asynchronous workers**, not a microservice system.

```text
frontend
    ↓
FastAPI application
    ├── API/webhook modules
    ├── application/domain services
    ├── provider integrations
    ├── repositories/persistence
    └── queue producer
             ↓
         Celery workers
```

This keeps deployment and debugging simple while preserving clear boundaries.

## 4. Logical Layers

```text
Presentation
    ↓
Application / API
    ↓
Domain
    ↓
Infrastructure / Integrations
```

### Presentation

React UI responsibilities:

- login/account screens;
- Instagram connection UI;
- library/search UI;
- saved-item detail UI;
- processing/error state display;
- user interactions.

It must not make authoritative ownership/security decisions.

### Application / API

FastAPI responsibilities:

- HTTP entry points;
- webhook entry points;
- authentication context;
- authorization orchestration;
- Pydantic request/response validation;
- calling domain/application services;
- enqueueing background work;
- safe error translation.

### Domain / Application Services

Responsibilities:

- connection rules;
- SavedItem lifecycle;
- processing-state transitions;
- extraction validation/business rules;
- search orchestration;
- re-analysis/correction rules.

Domain logic should consume normalized internal types, not raw Meta or LLM SDK objects.

### Infrastructure / Integrations

Responsibilities:

- Supabase/PostgreSQL persistence;
- Redis/Celery;
- Instagram/Meta adapter;
- AI provider adapters;
- OCR/STT/media tooling;
- temporary file handling;
- search implementation.

## 5. Core Components

### Auth

Supabase Auth provides authentication/session foundation.

The backend still establishes authorization for protected actions.

### Instagram Integration

Contains:

```text
connection handshake
webhook verification
provider event parsing
sender identity resolution
shared-source normalization
```

It emits normalized internal events.

### Saved Items

Represents user intent to remember a source.

A SavedItem survives AI/media processing failure.

### Processing

Coordinates asynchronous work and lifecycle state.

### Evidence

Keeps evidence distinguishable by origin:

```text
visual
transcript
OCR
caption
hashtags
provider metadata
```

### Understanding

Stores validated AI-derived interpretation.

### Search

V1 uses PostgreSQL search over source and derived understanding. `pgvector` is a later extension only when semantic retrieval is justified.

## 6. Provider Adapter Boundary

Instagram-specific details stop at the adapter.

```text
Meta webhook payload
       ↓
Instagram adapter
       ↓
NormalizedInstagramEvent
       ↓
application/domain logic
```

Future source support should follow:

```text
Instagram adapter ─┐
                   ├──► Normalized SavedItem pipeline
YouTube adapter ───┘        (future, not V1)
```

Likewise for AI:

```text
UnderstandingService
        ↓
UnderstandingProvider interface
        ├── provider implementation A
        ├── provider implementation B
        └── future/local implementation
```

## 7. Media Architecture

Raw media is temporary by default.

```text
Instagram source reference
          ↓
worker retrieves media if needed
          ↓
temporary processing area
          ↓
frames / audio / OCR / transcript
          ↓
evidence fusion
          ↓
validated Understanding
          ↓
PostgreSQL
          ↓
temporary media cleanup
```

Supabase Storage is **not** the permanent home for every Reel.

It may be used for small/derived assets or explicitly justified temporary/storage needs.

## 8. Data Ownership Boundary

Every user-owned domain object ultimately scopes to the authenticated OurApp user.

```text
Supabase Auth identity
        ↓
OurApp user/profile identity
        ↓
ConnectedInstagram
        ↓
SavedItem
        ↓
ProcessingJob / Evidence / Understanding
```

Ownership checks happen server-side, with RLS as defense-in-depth for exposed tables.

## 9. Dependency Direction

Preferred:

```text
routes/tasks
    ↓
application/domain services
    ↓
interfaces/contracts
    ↓
infrastructure implementations
```

Avoid domain code importing provider SDKs directly.

Avoid React components calling Supabase privileged operations directly.

## 10. Failure Isolation

External failures should degrade the affected processing step, not corrupt the save.

Examples:

- Meta media unavailable → SavedItem remains.
- transcription fails → job records failure/retry state.
- AI output invalid → reject extraction; keep source/evidence.
- search indexing fails → memory remains persisted and can be retried.

## 11. Scaling Philosophy

Scale only the bottleneck that exists.

Likely early independent scaling unit:

```text
FastAPI API instances
        +
Celery worker count
```

Do not introduce new distributed systems before observed requirements justify them.

## 12. Repository Direction

The exact repository may evolve, but the intended shape is:

```text
ourapp/
├── frontend/
│   └── src/
│       ├── components/
│       ├── features/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       ├── lib/
│       └── types/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── domain/
│   │   ├── services/
│   │   ├── integrations/
│   │   │   ├── instagram/
│   │   │   ├── ai/
│   │   │   └── storage/
│   │   ├── workers/
│   │   ├── schemas/
│   │   └── repositories/
│   └── tests/
├── supabase/
│   └── migrations/
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

This is a direction, not permission to create empty speculative modules before they are needed.
