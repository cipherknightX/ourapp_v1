# security.md — Security Requirements & Review Checklist

> Security is implemented continuously, not appended at the end.
>
> This file is a working checklist for implementation, review, and release.

## 1. Threat Boundaries

Primary trust boundaries:

```text
Browser / user input
       ↓
FastAPI API
       ↓
database / queue / providers

Meta / Instagram webhook
       ↓
FastAPI webhook
       ↓
internal normalized event

Reel / external media content
       ↓
media/OCR/STT/AI pipeline
       ↓
validated derived data

AI model output
       ↓
schema + business validation
       ↓
persistence
```

Everything crossing these boundaries is untrusted until validated.

## 2. Keys & Secrets

- [ ] API keys are not hard-coded.
- [ ] `.env` and credential files are ignored.
- [ ] `.env.example` contains placeholders only.
- [ ] Production/dev secrets are separated.
- [ ] Supabase privileged/service-role keys are server-only.
- [ ] Only intentionally public client keys are exposed.
- [ ] Webhook secrets/tokens are server-only.
- [ ] Secrets are not logged.
- [ ] Secret scanning runs in CI where configured.
- [ ] If a secret enters Git history, it is purged as needed **and rotated**.

## 3. Authentication & Sessions

- [ ] Protected endpoints require server-validated authentication.
- [ ] Session/token expiry behavior is understood.
- [ ] Logout/revocation behavior is implemented as appropriate to Supabase Auth.
- [ ] Secure transport is used in production.
- [ ] If cookies are used for app sessions, appropriate Secure/HttpOnly/SameSite settings are used.
- [ ] If OurApp ever directly handles passwords, modern password hashing is used; plaintext/reversible password storage is forbidden.

## 4. Authorization / IDOR

- [ ] Every protected resource operation checks authorization.
- [ ] Ownership is derived from authenticated server context.
- [ ] Client-supplied `user_id` cannot claim or reassign records.
- [ ] User A cannot read User B's SavedItems.
- [ ] User A cannot update/delete User B's SavedItems.
- [ ] User A cannot read/modify User B's Understanding/jobs/connections.
- [ ] Admin/service-role operations have explicit authorization logic.

## 5. Supabase / RLS

- [ ] RLS enabled on exposed user-owned tables.
- [ ] Read policies tested.
- [ ] Insert ownership policies tested.
- [ ] Update/delete policies tested where applicable.
- [ ] Cross-user negative tests exist.
- [ ] Service-role key never appears in frontend bundle.
- [ ] Privileged backend operations do not treat RLS bypass as authorization.
- [ ] Database roles follow least privilege.

## 6. Instagram Connection Security

- [ ] Connection state/token is sufficiently unguessable.
- [ ] It is bound to the initiating OurApp user.
- [ ] It expires.
- [ ] It is single-use/replay-safe where applicable.
- [ ] A connected Instagram provider identity cannot silently be claimed by another OurApp user.
- [ ] Mutable username is not used as identity.
- [ ] Disconnect/reconnect behavior is defined and tested.

## 7. Webhook Security

- [ ] Meta webhook verification/setup requirements are implemented according to the current supported API.
- [ ] Event authenticity/signature is verified where supported/required.
- [ ] Payload schema is validated.
- [ ] Unsupported event types are handled safely.
- [ ] Duplicate events are idempotent.
- [ ] Webhook route does not trust arbitrary sender/user IDs.
- [ ] Webhook handler responds without performing expensive processing.
- [ ] Logs do not dump sensitive full payloads unnecessarily.

## 8. Input Validation

- [ ] Pydantic/request validation at API boundaries.
- [ ] Length/count limits on user strings/lists.
- [ ] Known-value fields use allowlists/enums.
- [ ] Database access is parameterized.
- [ ] No raw input is interpolated into shell commands.
- [ ] Output is encoded/escaped for its rendering context.
- [ ] XSS defenses are present.
- [ ] Path traversal defenses are present.
- [ ] Unsafe URL schemes are rejected.
- [ ] Mass-assignment/field-tampering is prevented.

## 9. SSRF / External URL Retrieval

The worker may retrieve external media. Treat source URLs as hostile.

- [ ] Validate allowed schemes.
- [ ] Restrict/validate hosts according to the supported provider flow.
- [ ] Block loopback/private/link-local/internal network targets.
- [ ] Limit redirects.
- [ ] Limit response size/time.
- [ ] Do not forward internal credentials to arbitrary URLs.
- [ ] Timeouts are configured.

## 10. Media Processing

- [ ] Media type validated beyond declared MIME where practical.
- [ ] File size limited.
- [ ] Duration/processing limits applied.
- [ ] Temporary files live outside executable/public paths.
- [ ] File names/paths are not trusted from external input.
- [ ] Processing tools/dependencies are kept patched.
- [ ] Worker privileges are minimized.
- [ ] Temporary media cleanup occurs after success and terminal failure.
- [ ] Raw Reel media is not permanently stored by default.

## 11. AI / Prompt Injection

Reel text/audio/captions are untrusted content, not instructions.

- [ ] System/developer extraction instructions are separated from source content.
- [ ] Source text cannot override authorization/security rules.
- [ ] Model output is schema-validated.
- [ ] Model cannot execute arbitrary commands.
- [ ] Model cannot choose SQL/ownership permissions.
- [ ] Model-generated URLs are validated before use.
- [ ] Unsupported facts are rejected/left unknown.
- [ ] Sensitive data is not sent to model providers unnecessarily.

## 12. Rate Limits & Abuse

At minimum evaluate:

- [ ] login/auth abuse;
- [ ] connection attempts;
- [ ] re-analysis/expensive processing;
- [ ] search/API abuse;
- [ ] retry storms;
- [ ] bot/automation abuse.

Exact limits are implementation/configuration decisions and should be observable/tunable rather than scattered magic numbers.

## 13. API / HTTP

- [ ] HTTPS forced in production.
- [ ] CORS restricted to intended origins.
- [ ] CSRF considered when cookie-based authenticated state is used.
- [ ] Security headers configured.
- [ ] Request body/query limits configured.
- [ ] Responses expose only required fields.
- [ ] Production stack traces disabled.
- [ ] Error responses do not leak SQL, secrets, provider tokens, or internal paths.

## 14. Logging / Monitoring

- [ ] Structured logs.
- [ ] Correlation/request IDs where useful.
- [ ] No secrets.
- [ ] No unnecessary raw private content.
- [ ] Authentication failures observable.
- [ ] Authorization failures observable.
- [ ] Webhook failures observable.
- [ ] Processing failures observable.
- [ ] Rate-limit/abuse signals observable.
- [ ] Important connection/account-security changes auditable.

## 15. Dependencies / Supply Chain

- [ ] Lockfiles committed.
- [ ] Dependency vulnerability scanning.
- [ ] New dependencies reviewed for maintenance/security.
- [ ] Runtime/container images patched.
- [ ] CI permissions follow least privilege.
- [ ] Third-party SDKs do not receive unnecessary secrets/data.

## 16. Cost / Resource Abuse Security

Resource exhaustion is also a security concern.

- [ ] Expensive operations have limits.
- [ ] Celery retries are bounded.
- [ ] Media downloads have time/size limits.
- [ ] AI re-analysis cannot be spammed without controls.
- [ ] Provider spend/cost controls enabled where available.
- [ ] Jobs cannot recurse/enqueue infinitely.

## 17. Pre-Release Security Gate

Before production release:

```text
[ ] secret scan passes
[ ] dependency scan reviewed
[ ] auth tests pass
[ ] cross-user authorization tests pass
[ ] RLS negative tests pass
[ ] webhook authenticity tests pass
[ ] idempotency tests pass
[ ] SSRF/media validation tests pass
[ ] rate-limit/abuse controls reviewed
[ ] temporary-media cleanup verified
[ ] HTTPS/CORS/security headers verified
[ ] production errors checked for leakage
[ ] privileged keys verified server-only
```

## 18. Security Decision Rule

Changes to authentication, authorization, RLS strategy, provider identity mapping, secret handling, media retention, or trust boundaries require human review and usually an entry in `decisions.md`.
