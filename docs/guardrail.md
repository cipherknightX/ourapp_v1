# guardrail.md — Non-Negotiable Guardrails

> **Authority:** highest-level engineering/product rules for V1.
>
> AI agents must not violate these rules merely to make an implementation easier.

---
> **Invariant:** Raw Reel media is temporary by default and must not be permanently stored in V1.

## G1. V1 Is Instagram-First

Do not add YouTube or another ingestion platform to V1 without explicit approval.

The architecture may remain extensible, but extensibility must not become speculative implementation.

---

## G2. Save First, Understand Second

The user's save must become durable before expensive processing begins.

```text
Incoming Reel
     │
     ▼
Validate + resolve owner
     │
     ▼
Create durable SavedItem
     │
     ▼
Queue processing
     │
     ▼
Return quickly
```

AI/media failure must never erase the fact that the user saved the item.

---

## G3. Source and Understanding Are Separate

```text
SavedItem (authoritative source memory)
             │
             └────► Understanding (derived, replaceable)
```

- extraction may be retried/replaced/versioned;
- the source record survives extraction failure;
- deleting/rebuilding an extraction must not delete the SavedItem;
- derived search data must not become the only copy of authoritative information.

---

## G4. No Permanent Raw Reel Warehouse

Do not permanently store every Reel/video in V1.

Persist:
- source/provider reference;
- ownership;
- relevant source metadata;
- compact derived evidence when justified;
- validated understanding;
- search/index data.

Temporary media may be acquired for processing and must be cleaned up according to policy.

Do not introduce permanent raw-media storage without an explicit decision covering:
- product need;
- provider/platform constraints;
- copyright/legal implications;
- storage/egress cost;
- retention/deletion behavior;
- security.

---

## G5. Understand the Actual Content

Captions, descriptions, and hashtags can be misleading or unrelated.

Evidence priority is contextual, but the system should combine:

```text
Visual content
Spoken audio / transcript
On-screen text / OCR
Caption / description / hashtags
Provider metadata
```

Do not blindly equate caption text with Reel meaning.

Unknown is preferable to fabricated certainty.

Never invent unsupported:
- prices;
- ingredients/quantities;
- addresses;
- place names;
- ratings;
- opening hours;
- dates;
- links;
- product specifications;
- people/entities;
- factual claims.

---

## G6. Low-Information Content Is Still Valid

Not every save needs a rich extraction.

Examples:
- cat videos;
- edits;
- memes;
- songs;
- couple/friendship Reels;
- visually pleasing content saved simply to revisit/share.

The product must preserve these saves cleanly without manufacturing useless structured information.

---

## G7. Ownership Is Absolute

A user may access only resources they are authorized to access.

Never rely on:
- frontend filtering;
- client-supplied `user_id`;
- mutable Instagram usernames;
- hidden UI controls

as authorization.

Use stable internal user IDs and stable provider-scoped identifiers.

---

## G8. Security Is Part of Implementation

Security is not a final milestone.

Authentication, authorization, validation, RLS, webhook verification, secrets, rate limits, safe URL/media handling, and least privilege are implemented with the features that require them.

---

## G9. Heavy Work Is Asynchronous

Webhook/API request handlers must not run the full media/AI pipeline.

```text
Request/Webhook → validate → persist → enqueue → return
                                         │
                                         ▼
                                      Worker
```

---

## G10. Provider Details Stay at Boundaries

Meta/Instagram payloads and AI-provider response objects must not spread through domain logic.

Normalize them through adapters/contracts.

Future YouTube ingestion should feed the same core SavedItem/processing pipeline.

---

## G11. Cost Is an Engineering Constraint

Avoid:
- unnecessary model calls;
- repeated analysis of unchanged content;
- permanent raw video storage;
- unbounded retries;
- uncontrolled media size/duration;
- accidental high-frequency jobs.

Where supported, configure quotas/spend/cost controls.

---

## G12. Do Not Overengineer V1

Do not introduce:
- microservices;
- Kubernetes;
- Kafka;
- Elasticsearch;
- separate vector DB;
- speculative abstraction layers

without a demonstrated requirement and explicit decision.

A modular monolith + worker architecture is intentional.

---

## G13. Meaningful Changes Must Remain Explainable

- architectural decisions → `decisions.md`
- execution changes → `flow.md`
- contract changes → `contracts.md`
- schema changes → `database.md` + migrations
- security changes → `security.md` where relevant
- stack changes → `techstack.md`

Do not let documentation silently drift from implementation.

---

## G14. Human Approval Required

Stop and ask before:
- changing V1 product scope;
- changing auth/security model;
- changing privacy/retention policy;
- introducing permanent raw media storage;
- changing a major stack component;
- breaking public/internal contracts used by multiple modules;
- introducing a major external provider;
- making monetization decisions;
- accepting a known significant security weakness.

---

## Agent Reminder

```text
DO NOT INVENT.
DO NOT SILENTLY CHANGE CONTRACTS.
DO NOT DUPLICATE BEFORE SEARCHING.
DO NOT TRUST EXTERNAL OR AI INPUT.
DO NOT TRADE SECURITY/DATA INTEGRITY FOR SPEED.
```
