# instructions.md — AI Agent & Contributor Operating Manual

> **Primary audience:** AI coding agents.
>
> Human contributors should follow the same workflow.
>
> The goal is to prevent correct local code from creating globally inconsistent architecture, contracts, naming, security, or data behavior.

---

## 1. Mandatory Pre-Work Sequence

Before meaningful code changes:

```text
Read task
   │
   ▼
Read guardrail.md
   │
   ▼
Read relevant architecture/contracts/flow/DB/security/testing/techstack docs
   │
   ▼
Inspect repository + git diff/status
   │
   ▼
Search for existing implementation
   │
   ▼
Trace callers/consumers
   │
   ▼
Write a small implementation plan
   │
   ▼
Change code
```

Do not immediately generate files from the task description alone.

---

## 2. Scope Declaration

For meaningful tasks, establish internally:

```text
Goal:
Expected files/modules:
Existing code to reuse:
Contracts affected:
Data/schema affected:
Security implications:
Cost implications:
Tests required:
Docs required:
```

If the task unexpectedly expands beyond this scope, reassess before continuing.

---

## 3. Search Before Creating

Before adding:
- endpoint;
- component;
- hook;
- service;
- utility;
- model;
- schema;
- worker task;
- integration;
- provider abstraction;

search the repository for equivalent behavior.

Do not create `foo_v2`, `new_helper`, or duplicate logic to avoid understanding existing code.

---

## 4. Naming Rules

Use clear domain language.

### Prefer

```text
resolveInstagramSender
createSavedItem
enqueueProcessingJob
validateUnderstanding
cleanupTemporaryMedia
```

### Avoid

```text
data
thing
stuff
obj
misc
helper
manager
utils2
newService
tempFunction
```

A generic module such as `utils` should only contain genuinely cross-cutting, coherent utilities—not unrelated leftovers.

### Booleans

Prefer:
- `isConnected`
- `hasUnderstanding`
- `canRetry`
- `isProcessing`

### Public names

Do not casually rename:
- API fields;
- DB columns;
- shared types;
- exported functions;
- queue payload fields;
- environment variables.

Check consumers first.

---

## 5. Module Responsibility

Prefer:

```text
API layer          → request/auth/orchestration
Domain/service     → product rules
Integration        → provider-specific behavior
Repository/data    → persistence concerns
Worker             → async execution
Schema/contract    → validation/boundary shape
```

Avoid giant functions mixing all of these.

Do not create abstraction layers with no current responsibility.

---

## 6. Frontend Rules

- TypeScript by default.
- Keep backend/API communication in explicit service/client boundaries.
- Components should not contain secrets.
- Frontend checks improve UX but do not replace backend authorization.
- Do not trust hidden buttons/routes as security.
- Reuse common UI primitives.
- Avoid storing privileged tokens in unsafe browser storage.
- Do not invent backend response fields; follow contracts.

---

## 7. FastAPI Rules

Endpoints should generally:

```text
receive
  ↓
authenticate
  ↓
validate
  ↓
authorize
  ↓
call application/service logic
  ↓
shape response
```

Do not:
- embed huge business workflows directly in route handlers;
- perform full Reel AI processing in webhook routes;
- expose raw exceptions;
- accept arbitrary ownership fields;
- return ORM/internal objects without controlled response schemas.

---

## 8. Supabase/Postgres Rules

- schema changes use migrations;
- user-owned exposed tables use appropriate RLS;
- backend authorization remains required;
- service-role keys are server-only;
- never trust client `user_id`;
- use constraints for critical invariants;
- add indexes for demonstrated query/access patterns;
- document meaningful schema decisions.

Do not use Supabase as an excuse to bypass backend architecture.

---

## 9. Redis/Celery Rules

Queue payloads should contain compact stable identifiers, not large media blobs.

Prefer:

```text
{ saved_item_id, job_id, ...small stable fields }
```

not entire video/media payloads.

Tasks must consider:
- idempotency;
- retryability;
- bounded retries;
- timeouts;
- terminal failure;
- cleanup;
- safe logging.

---

## 10. Instagram Integration Rules

- isolate raw Meta behavior under the Instagram integration boundary;
- verify provider authenticity as supported;
- normalize payloads;
- use stable provider IDs;
- deduplicate repeated events;
- do not use display username as identity;
- do not invent undocumented Meta behavior.

If actual Meta API capability contradicts an assumed design, stop and update the design/decision rather than hacking around it.

---

## 11. AI / Extraction Rules

AI output is untrusted.

Pipeline:

```text
Evidence
  ↓
Provider call
  ↓
Candidate structured result
  ↓
Schema validation
  ↓
Evidence/business validation
  ↓
Persist
```

Rules:
- captions are evidence, not truth;
- preserve evidence provenance;
- do not hallucinate missing facts;
- unknown is valid;
- low-information content does not require fake extraction;
- provider SDK objects do not leak into domain persistence;
- use deterministic code for deterministic work;
- avoid unnecessary repeated model calls.

---

## 12. Media Rules

- raw Reel media is temporary by default;
- validate source URLs;
- bound file size/duration/time;
- keep temp files out of public executable paths;
- clean temp files on success and terminal failure;
- do not add permanent video storage without human approval.

---

## 13. Error Handling

Classify errors.

```text
Validation
Authentication
Authorization
Provider/API
Rate limit
Network/timeout
Processing
AI validation
Internal programming error
```

Do not:
- swallow exceptions;
- return success for failed work;
- retry permanent failures forever;
- leak internal stack traces/secrets.

---

## 14. Idempotency

Always consider duplicate delivery for:
- Meta webhooks;
- callbacks;
- Celery retries;
- external provider retries.

A repeated event must not accidentally create repeated logical saves or corrupt state.

---

## 15. Security Rules

For any security-sensitive task, read `security.md`.

At minimum:
- no secrets in code/logs;
- server-side auth + authorization;
- RLS where applicable;
- parameterized DB access;
- input validation;
- webhook verification;
- SSRF-safe media fetching;
- rate limits for abuse/expensive operations;
- safe temporary media handling;
- least privilege.

Security TODOs that leave an exposed feature unsafe are not acceptable as "finish later" work unless explicitly approved.

---

## 16. Dependency Rules

Before adding a dependency:
1. check existing stack capability;
2. search current dependencies;
3. verify it solves a real problem;
4. assess maintenance/security;
5. assess size/runtime/operational cost;
6. document it if architecturally meaningful.

Do not add a library simply because generated examples commonly use it.

---

## 17. Testing Rules

Behavior changes require relevant tests.

Prioritize:
- pure logic → unit;
- DB/API/provider boundaries → integration;
- critical user journey → E2E;
- security bugs → regression/security test.

Never weaken/remove a valid test just to make generated code pass.

---

## 18. Git / Multi-Agent Coordination

Before modifying shared code:
- inspect `git status`;
- inspect current diff;
- inspect nearby recent changes when available;
- avoid overwriting uncommitted work.

Use focused commits such as:

```text
feat: add Instagram connection handshake
fix: make webhook save idempotent
refactor: isolate understanding validation
test: block cross-user SavedItem access
docs: update processing flow
```

Avoid:
`update`, `stuff`, `final`, `changes`.

When conflicts occur, understand both sides. "Newest" is not automatically correct.

---

## 19. Documentation Update Matrix

| Change | Required doc consideration |
|---|---|
| execution path | `flow.md` |
| architecture/module boundary | `architecture.md` + `decisions.md` |
| API/event/job shape | `contracts.md` |
| schema/RLS | `database.md` + migrations |
| security behavior | `security.md` |
| stack/dependency architecture | `techstack.md` + `decisions.md` |
| testing strategy | `testing.md` |
| product/non-negotiable boundary | `guardrail.md` + human approval |

---

## 20. Decision Logging

Record meaningful decisions in `decisions.md`.

Do not record trivial code formatting/naming choices.

If changing an accepted ADR, create a superseding decision rather than silently editing history.

---

## 21. Conflict Resolution

If docs/code/task disagree:

```text
guardrail
   ↓
accepted ADR
   ↓
techstack / architecture / contracts
   ↓
flow / DB / security / testing
   ↓
implementation/tests
```

Investigate why the mismatch exists.

For security/product/architecture/breaking-contract ambiguity: **ask rather than guess**.

---

## 22. Completion Checklist

Before declaring a task complete:

- [ ] intended behavior implemented
- [ ] no unrelated refactor
- [ ] existing implementation reused where appropriate
- [ ] naming follows conventions
- [ ] contracts remain aligned
- [ ] authorization/ownership considered
- [ ] input validation considered
- [ ] async boundary respected
- [ ] retries/idempotency considered
- [ ] temporary media lifecycle safe if relevant
- [ ] cost implications considered
- [ ] tests added/updated
- [ ] relevant tests pass
- [ ] lint/type/build checks pass where configured
- [ ] no secrets introduced
- [ ] docs updated
- [ ] meaningful decision recorded if required

---

## 23. Agent Completion Report

For meaningful work, report:

```text
## Implementation Summary

### Changed
- ...

### Why
- ...

### Tests
- ...

### Security / data considerations
- ...

### Documentation
- ...

### Decisions
- ...

### Known limitations / follow-up
- ...
```

Do not claim something was tested if it was not actually tested.

---

## 24. Definition of Done

A generated implementation is done only when it is:

```text
Correct
+ integrated
+ secure enough for its boundary
+ tested
+ contract-compatible
+ documented
+ understandable by the next contributor
```
