# ADR-0001 — One Milo identity, multiple governed learning engines

- Status: Accepted for Architecture 2.0 planning
- Date: 2026-10-01

## Context

LMU intends to add capabilities comparable in category to several strong education products: early-years learning, adaptive practice, child-safe reasoning, language voice coaching, AI literacy, coding/AI projects and context-aware tutoring. Implementing each as a separate learner-facing AI would fragment identity, progress, safety, curriculum and teacher visibility.

## Decision

Use **one Milo learner-facing identity** backed by an internal orchestrator and multiple specialist learning engines.

Every engine uses:
- the same learner context;
- the same curriculum graph;
- the same tutor/safety policy framework;
- the same tool authorization layer;
- the same structured learning-event model;
- the same evidence/mastery pipeline;
- the same relationship-authorized parent/teacher visibility.

## Consequences

Positive:
- one coherent learner relationship;
- one mastery history;
- easier teacher/parent understanding;
- reusable safety and consent controls;
- engines can be independently improved without fragmenting learner UX;
- current LMU evidence/review/mastery architecture remains valuable.

Tradeoffs:
- orchestrator and contract design become critical infrastructure;
- engine routing must be observable and testable;
- shared context requires strict data minimization;
- failures in common policy services can affect multiple experiences;
- age adaptation must be explicit rather than left to a generic prompt.

## Rejected alternatives

### Eight independent bots
Rejected because it fragments learner context, auditability, mastery and safety.

### One giant unrestricted prompt
Rejected because it is difficult to test, authorize, version and constrain by assessment/age/tool context.

### Separate progress model per learning mode
Rejected because LMU mastery must reflect a learner's complete evidence history.

## Non-negotiable controls

- authorization enforced server/database-side;
- assessment guard and answer-prevention;
- guardian consent for sensitive media;
- private evidence storage;
- teacher-governed academic review;
- no child-facing open-web browsing;
- no privileged credentials in clients;
- finite age-appropriate session objectives;
- auditable assistance levels.
