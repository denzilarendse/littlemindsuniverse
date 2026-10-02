# LittleMindsUniverse Architecture 2.0 — Milo Learning OS

Status: **Architecture baseline / implementation contract**  
Branch: `architecture-2.0`  
Release rule: **No production deployment without owner authorization.**

## 1. Architectural intent

LittleMindsUniverse remains one education platform for ages 2–18. Milo remains one learner-facing identity. Architecture 2.0 adds specialist learning engines behind Milo rather than creating eight disconnected assistants or progress systems.

The design may adopt general capabilities and pedagogical patterns observed in Khan Academy Kids, PixKid, LittleLit AI, Whizbee, Buddy AI, AdaptedMind, Codingal and Brilliant/Koji. It must not copy proprietary source code, branded characters, artwork, copyrighted lesson libraries, or protected visual designs.

## 2. Protected invariant

The already-proven academic vertical slice is not replaced:

```
teacher creates + maps work
  → publishes
  → learner receives
  → learner works
  → private evidence
  → atomic submission
  → teacher inbox/review
  → mastery evidence
  → learner mastery recalculation
```

All Architecture 2.0 engines must integrate through this governed evidence/mastery path when an interaction affects academic records.

## 3. Five permanent layers

### Learner Context
Resolves the minimum context needed for a session: learner, age/stage, country/curriculum, classroom, current curriculum node, prerequisite/mastery state, misconceptions, language, assistance allowance, assessment mode and consent/tool permissions.

### Milo Orchestrator
Routes a learning goal to the correct engine and tools. It owns session policy, lesson planning, curriculum retrieval, assistance limits, assessment guard and learning-event emission.

### Specialist engines
1. Milo Early Learning World
2. Milo Play & Story Studio
3. Milo AI Literacy & Creativity Lab
4. Milo Reasoning Missions
5. Milo Voice & Language Coach
6. Milo Adaptive Learning Engine
7. Milo Coding & AI Builder
8. Brilliant Milo Tutor

Engines are capabilities, not independent identities. They do not own separate learner accounts or mastery stores.

### Tool layer
Whiteboard, voice, manipulatives, interactive activities, curriculum lookup, evidence capture and an isolated code sandbox. Tool access is explicit and session-scoped.

### Governance layer
Authentication, RLS, role authorization, child safety, guardian consent, teacher authority, answer-prevention, assessment integrity, audit logging, rate limits, retention/deletion and AI/tool security.

## 4. Canonical tutoring loop

```
DIAGNOSE
→ EXPLAIN / MODEL AN ANALOGOUS EXAMPLE
→ LEARNER ATTEMPT
→ OBSERVE
→ QUESTION / HINT
→ LEARNER RETRY
→ TRANSFER CHECK
→ EVIDENCE
→ TEACHER / MASTERY GOVERNANCE
```

Milo may teach a method, explain a concept and model analogous examples. In guarded learning/assessment contexts Milo must not complete the target response for the learner.

## 5. Common contracts

Every engine integrates through the contracts in `docs/MILO-LEARNING-OS-CONTRACTS.md`.

Required contracts:
- LearnerContext
- CurriculumNode
- EngineRequest
- EngineResult
- TutorPolicy
- ToolPermission
- LearningEvent
- EvidenceAdapter
- SafetyEvent

## 6. Engine routing

Routing considers age/development, curriculum node, learning objective, modality, mastery state, current assignment and assessment policy.

Examples:
- age 4 number-sense lesson → Early Learning + Play/Story + manipulatives
- age 9 multiplication misconception → Adaptive + Reasoning + whiteboard
- age 12 conversational language → Voice/Language + transcript evidence
- age 14 Python debugging → Coding + Brilliant Milo + sandbox
- curriculum topic request → Brilliant Milo + curriculum retriever + relevant specialist engine

## 7. Evidence and mastery

There is one academic history. Engines emit structured LearningEvents. Events that qualify as evidence are adapted into the existing evidence/submission/review/mastery pipeline. AI inference alone never silently becomes a teacher-approved mastery judgement.

## 8. Communication

LittleMinds Connect / in-app messaging is the canonical communication layer. External messaging integration is excluded from Architecture 2.0.

## 9. Child-facing web access

Milo does not expose unrestricted open-web browsing to children. Retrieval sources used for lessons must be curriculum-approved or server-side governed. Retrieved text is untrusted input and cannot grant tool permissions or override system/tutor policy.

## 10. Data minimization

Collect only information necessary for learning, safety, consent, security and operations. Competitor collection practices are not requirements. Precise location, contacts and unrelated device data are not Architecture 2.0 learner-context requirements.

## 11. Implementation order

1. capability matrix + contracts
2. stabilize shared LMU core
3. Milo orchestrator
4. early-years world
5. reasoning/adaptive/voice/AI-literacy engines
6. coding/AI builder
7. Brilliant Milo unified tutor
8. whole-platform validation + Android/Play release gate

Each stage is a small, testable vertical slice. Security regressions require both a blocked unauthorized-path test and a passing legitimate-path test.

## 12. Release gate

Readiness and authorization are separate. A release state is only:
- READY
- READY WITH KNOWN NON-BLOCKERS
- HOLD

No public deployment, production promotion, store publication or DNS mutation is implied by readiness.
