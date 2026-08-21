# OurApp — Engineering Documentation

> **Product idea:** an Instagram-first personal memory layer.
>
> **Product principle:** **Save once. Understand immediately. Remember later.**
>
> This documentation is written primarily for AI coding agents, while remaining readable for human contributors. Before changing the codebase, agents must read the relevant documents listed below.

---

## 1. V1 Product Definition

A user creates an OurApp account, connects one or more Instagram accounts through the OurApp Instagram DM flow, sends Reels to `@ourapp`, and OurApp:

1. secures the save/reference immediately;
2. associates it with the correct OurApp user;
3. queues background processing;
4. temporarily acquires the media/evidence needed for analysis;
5. understands the actual Reel using multimodal evidence rather than blindly trusting its caption;
6. stores compact structured understanding and searchable metadata;
7. cleans up temporary raw media;
8. lets the user search, revisit, and open the original Reel together with the extracted information.

### Canonical user journey

```text
Create / Sign in to OurApp
            │
            ▼
Connect Instagram account(s)
            │
            ▼
Send a Reel to @ourapp
            │
            ▼
OurApp immediately records the save
            │
            ▼
Background understanding pipeline
            │
            ▼
Searchable personal library
            │
            ▼
Open saved item
     ┌──────┴──────┐
     ▼             ▼
Original Reel   Extracted memory
/link/embed     / useful information
```

---

## 2. V1 Scope

### Included

- OurApp account creation/sign-in
- Instagram-first ingestion
- DM-based Instagram account connection
- support for multiple Instagram accounts connected to one OurApp account
- Reel save/reference capture
- durable SavedItem record before expensive processing
- asynchronous processing
- temporary media processing
- transcription / OCR / visual evidence where needed
- multimodal content understanding
- evidence-aware structured extraction
- persistent extracted understanding
- library
- search
- source-platform filtering where relevant
- saved-item detail view showing the original source and extracted information
- low-information/cute/edit/etc. content that may simply be saved for later viewing
- optional extraction visibility rather than forcing useless extracted information into every item
- user correction/re-analysis path
- security, authorization, rate limiting, idempotency, and operational safeguards

### Explicitly not V1

- YouTube ingestion
- importing the user's historical Instagram Saves
- TikTok / Facebook / X / Reddit ingestion
- social feed/community features
- recommendations
- gamification
- general-purpose AI chatbot
- ads
- complex subscription infrastructure
- Elasticsearch
- a separate vector database
- permanent storage of every Reel/video file
- microservices/Kubernetes/Kafka

Future YouTube support should be an **additional ingestion adapter**, not a second copy of the product's core logic.

---

## 3. Critical Storage Principle

**OurApp is not a video-hosting service.**

The system should persist the user's memory of a Reel, not a permanent raw copy of every Reel.

```text
Instagram Reel
      │
      ▼
Persist source reference + minimal metadata
      │
      ▼
Temporarily acquire media when analysis requires it
      │
      ▼
Transcript / OCR / visual evidence / AI understanding
      │
      ▼
Persist compact derived understanding + search data
      │
      ▼
Delete temporary raw media
      │
      ▼
Revisit through supported source link/embed/reference
```

Temporary media is implementation material, not the product's permanent source of truth.

---

## 4. Documentation Map

| Document | Purpose | Read when |
|---|---|---|
| `guardrail.md` | Non-negotiable product, security, data, cost, and architecture boundaries | **Before every meaningful task** |
| `instructions.md` | Operating rules for AI agents and contributors | **Before every coding task** |
| `techstack.md` | Locked V1 stack and technology boundaries | Adding/changing technology |
| `architecture.md` | Canonical system architecture and module responsibilities | Structural/backend work |
| `flow.md` | Runtime execution paths and state transitions | Changing execution flow |
| `contracts.md` | Stable boundaries between components | API/webhook/job/schema changes |
| `database.md` | Data ownership, entities, relationships, migrations, RLS | Database/data work |
| `security.md` | Security requirements and review checklist | Any exposed or sensitive feature |
| `testing.md` | Required test strategy and critical scenarios | Implementing/fixing behavior |
| `decisions.md` | Architecture Decision Record log | Meaningful design decisions |

---

## 5. Document Authority

When information conflicts, use this order:

```text
guardrail.md
      ↓
accepted decisions in decisions.md
      ↓
techstack.md / architecture.md / contracts.md
      ↓
flow.md / database.md / security.md / testing.md
      ↓
current implementation + tests
```

If a lower-level document or the code contradicts a higher-level rule, **do not silently choose one**. Investigate and either repair the inconsistency or ask for human direction.

---

## 6. Contributor Rule

Before changing code:

> Read → inspect → trace → plan → change the smallest correct surface.

After changing code:

> Validate → test → review security/cost → update docs → record meaningful decisions.

Generated code is not automatically finished code.
