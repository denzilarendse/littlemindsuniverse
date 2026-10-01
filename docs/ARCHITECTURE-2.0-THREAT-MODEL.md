# Architecture 2.0 Child-Safety and AI Threat Model

Status: Stage 1 security baseline

## Protected assets

- learner identity and relationship data
- curriculum position and mastery
- private learner evidence
- guardian consent
- teacher academic authority
- assessment integrity
- authenticated sessions and secrets
- Milo tool permissions
- in-app communications

## Main threat classes and controls

### Answer leakage / assessment cheating
Threat: learner asks Milo to reveal or verify an answer during protected work.
Controls: server-derived assessment context, assistance limits, tutor policy, different-example teaching, first-attempt requirement, auditable assistance events.

### Prompt injection from retrieved or user content
Threat: text attempts to override tutor policy or grant tools.
Controls: retrieved text is untrusted data, never policy; tool permissions are server-side; engine output cannot grant itself new permissions; allowlisted tools only.

### BOLA / IDOR
Threat: changing learner/session/item UUID exposes another learner.
Controls: RLS, relationship predicates, RPC authorization, server-side learner-context resolution, test both deny and allow paths.

### Privileged RPC misuse
Threat: SECURITY DEFINER functions become unintended public APIs.
Controls: fixed/empty search_path, schema-qualified relations, explicit auth checks, revoke PUBLIC/anon, grant only intended roles, advisor review.

### Private evidence exposure
Threat: public URL or over-broad storage read.
Controls: private bucket, RLS-gated authenticated download, no public evidence URL, guardian/teacher status gates.

### Child-to-open-web exposure
Threat: browsing or retrieval returns unsuitable or manipulative content.
Controls: no unrestricted learner browsing; curriculum-approved/server-governed retrieval only; safety filter and domain/source policy.

### Over-collection
Threat: collecting contacts, precise location, device identifiers or conversation text without need.
Controls: purpose limitation, minimum event metadata, do not store full tutoring conversations merely for analytics, retention policy.

### Tool abuse / coding sandbox escape
Threat: generated code gains shell/network/filesystem access.
Controls: later coding engine must use isolated runtime, no unrestricted shell/network/host filesystem, resource limits and allowlists.

### Age-inappropriate interaction
Threat: language, session duration, content or motor demands exceed developmental stage.
Controls: stage resolver, engine routing, early-years contract, bounded turns, pre-reader UI, teacher/guardian context.

### Infinite engagement loops
Threat: reward/chat design optimizes for time rather than learning.
Controls: finite mission objectives, hard-stop completion states, no endless streak-pressure requirement for young children.

### Model/provider failure
Threat: hallucination, unsafe output, outage or cost spike.
Controls: provider abstraction, server-side model routing, low-temperature constrained prompts, bounded tokens, logging, rate limits, graceful failure, future eval suite.

## Release-blocking tests

- unauthorized learner/session access denied
- legitimate learner access succeeds
- assessment spoof flag cannot weaken restrictions
- direct answer policy covered by unit/eval tests
- private evidence cannot be fetched without relationship authorization
- teacher review remains human-controlled
- engine events cannot directly mutate mastery
- no child-facing public web retrieval route
