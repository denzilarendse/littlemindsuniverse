# ADR-001: One Milo Learning OS, Eight Specialist Engines

Date: 2026-10-01  
Status: Accepted for Architecture 2.0

## Context

LMU is expanding with capabilities inspired by eight education products. Implementing eight independent bots would fragment identity, curriculum position, safety, evidence, mastery, analytics and teacher oversight.

## Decision

LMU will expose one AI identity, Milo, backed by a common orchestrator and eight specialist capability engines.

Milo owns:
- learner-context resolution
- curriculum/skill routing
- tutor policy
- engine selection
- tool permission checks
- common learning events
- safety events

Specialist engines do not own separate learner accounts or mastery stores.

## Consequences

Positive:
- one coherent learner experience
- consistent child-safety and assessment rules
- evidence from every modality can enter one governed pipeline
- engines can evolve independently behind stable contracts
- teacher and guardian reporting can aggregate across modalities

Tradeoffs:
- orchestration and contract design must be completed before rapid feature expansion
- shared services become critical infrastructure
- model/provider failures require graceful cross-engine handling

## Rejected alternatives

1. Eight independent chatbots: rejected because progress/safety/identity fragment.
2. Giant single prompt: rejected because it is difficult to test, route, govern and evolve.
3. Separate mastery per engine: rejected because LMU requires one evidence-based learner record.
4. Client-selected assessment/tutor permissions: rejected because browser state is not authorization.

## Non-negotiable invariant

No engine may silently create teacher-approved mastery. Academic evidence remains subject to the existing LMU evidence/review/mastery governance.
