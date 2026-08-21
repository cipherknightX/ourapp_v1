# V1 Implementation Roadmap — Instagram Memory

**Core flow:** OurApp account → connect Instagram → DM Reel → receive/save → analyze → store understanding → search → revisit

## Phase 0 — Foundation & Architecture
**Goal:** Get the skeleton right before touching Instagram.

- Set up frontend, backend, database, migrations, configuration, environment variables, secrets management, logging, error handling, and deployment skeleton.
- Define User, ConnectedInstagram, SavedItem, ProcessingJob, Evidence, and Understanding models.
- Build the API structure and security middleware.
- Use an asynchronous architecture: webhook → save event → queue → worker → AI processing → database.

## Phase 1 — OurApp Account & Basic UI
**Goal:** Give users a real private library.

- Implement sign-up, sign-in, logout, session/token management, profile/settings, account deletion, and authorization.
- Build the initial home/library page and empty states.
- Keep the initial UI clean: search, recently saved items, and Connect Instagram.

## Phase 2 — Instagram Connection
**Goal:** Connect Instagram accounts to the correct OurApp user through the DM workflow.

- Create/configure the OurApp Instagram Professional account and Meta developer application.
- Configure Instagram messaging and webhook verification.
- Receive incoming messages and extract the Instagram-scoped sender ID.
- Implement a secure connection handshake with short-lived state/token where required.
- Map Instagram scoped ID → OurApp user ID.
- Support multiple Instagram accounts per OurApp user.
- Build Connected Accounts UI with connect/disconnect/status.
- Do not use Instagram usernames as the permanent identity key.

## Phase 3 — Capture & Save Pipeline
**Goal:** Make a Reel sent through Instagram become a reliable SavedItem.

- Receive and validate the DM webhook.
- Resolve sender → OurApp user.
- Identify the shared Reel/media URL.
- Create the SavedItem immediately with platform, source URL, sender ID, creator/metadata where available, caption, thumbnail, timestamp, and processing status.
- Return quickly; never run heavy AI inside the webhook request.
- Use states such as RECEIVED, SAVED, PROCESSING, READY, and FAILED.
- Make saving independent of AI so the source survives processing failures.

## Phase 4 — Media Retrieval & Pre-AI Processing
**Goal:** Turn the Reel into reliable multimodal evidence.

- Resolve/retrieve available media and metadata.
- Handle video, audio, thumbnails, captions, hashtags, and metadata.
- Extract audio, transcribe speech, and run OCR on on-screen text.
- Keep visual, transcript, OCR, caption, hashtag, and metadata evidence separately.
- Apply media size/duration validation, temporary processing storage, cleanup, retries, and failure handling.

## Phase 5 — AI Understanding & Extraction
**Goal:** Understand what the Reel actually contains.

- Build evidence → classification → extraction → validation pipeline.
- Treat captions and hashtags as supporting evidence, not truth.
- Give visual content, transcript/audio, and on-screen text higher authority when sources conflict.
- Use evidence fusion/confidence internally.
- Never invent unsupported prices, addresses, ingredients, ratings, times, or specifications.
- Use content-specific extraction schemas for recipes, places, products, books, workouts, tutorials, edits/memes, etc.
- Allow low-information content to receive lightweight understanding instead of forcing deep extraction.

## Phase 6 — Persistent Memory
**Goal:** Make the understanding part of the saved memory.

- Persist source, evidence, and understanding with the SavedItem.
- Analyze after saving, store the result, and reuse it later.
- Do not re-analyze every time the Reel is opened.
- Support re-analysis when requested or when the extraction system is upgraded.
- Keep the original source independent from the AI layer.

## Phase 7 — Library & Content View
**Goal:** Make saved memories pleasant to browse and revisit.

- Build the saved-item library with thumbnails, source information, timestamps, and useful content-type indicators.
- Provide an Instagram filter for V1.
- Build a two-pane view for information-rich content: original Reel + extracted information.
- Use contextual views: recipe → ingredients/steps; place → location/details; product → product details; book → title/author/context.
- For low-information content, show the original Reel without forcing an extraction panel.

## Phase 8 — Search
**Goal:** Make saved memory retrievable months later.

- Implement unified search over the saved library.
- Search both the original saved item and information extracted from it.
- Start with structured/text search; add semantic/vector search once core retrieval is stable.
- Return actual Reels as well as extracted information when appropriate.
- Support searches such as 'that couple edit in the rain' and 'restaurants in Tokyo'.

## Phase 9 — User Control
**Goal:** Make AI helpful without taking control away.

- Allow editing/correction of extracted information.
- Allow manual re-analysis and retry of failed processing.
- Allow deleting extraction while keeping the original Reel.
- Allow deleting saved items and disconnecting Instagram accounts.

## Phase 10 — Security, Reliability & Production
**Goal:** Prepare for real users.

- Verify webhook signatures and validate incoming events.
- Enforce strict user-data isolation and authorization.
- Secure sessions, API authentication, secrets, and configuration.
- Add rate limiting, input validation, IDOR protection, and safe logging.
- Make jobs idempotent and handle duplicate webhook events.
- Add retries, failed-job handling, health checks, monitoring, backups, and structured logs.
- Ensure AI failure never destroys a saved source.

## Phase 11 — Cost & Monetization Instrumentation
**Goal:** Measure unit economics before charging.

- Track saved/analyzed Reels, processing time, model usage/tokens, storage, bandwidth, failures, and estimated cost per analyzed item.
- Measure average monthly cost per active user.
- Keep saving free as the core philosophy.
- Do not commit to final pricing until real usage/cost data exists.
- Potential future model: free saving + limited free AI understanding + optional paid tier.
- Do not build ads into the core V1 experience.

## Phase 12 — V1 Launch Criteria
**Goal:** The complete core loop works reliably.

- Create account → connect Instagram → send Reel → identify user → save Reel → process → understand → validate → persist → search → open original + extraction.
- Failures do not destroy the saved source.

## V1 Core Architecture

- User → OurApp account → Connect Instagram → @OurApp DM → Meta webhook → identify user → SavedItem → processing queue → media/audio/OCR → AI understanding → validation → persistent memory → library/search → original Reel + extracted information.
- Heavy media/AI processing is asynchronous.
- The source remains independent from AI processing.

## Explicitly Out of V1

- YouTube (later capture adapter)
- Existing Instagram Saves import
- TikTok/Facebook/X/Reddit/general web ingestion
- Social/collaboration/recommendations/gamification/AI chatbot
- Ads and full subscription system
- Large taxonomy and unnecessary settings

## V1 North Star

> Save once. Understand immediately. Remember forever.