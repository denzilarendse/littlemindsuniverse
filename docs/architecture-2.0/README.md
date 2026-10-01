# LittleMindsUniverse Architecture 2.0 — Milo Learning OS

Status: planning baseline locked on 2026-10-01.

## Goal

Evolve LittleMindsUniverse from a learning web/PWA with a governed Milo assistant into one coherent **Milo Learning OS**. The learner sees one Milo identity. Internally, Milo routes work to specialist learning engines while preserving one curriculum graph, one learner context, one evidence model, one teacher-governed mastery record, one child-safety boundary and one communication layer.

Architecture 2.0 extends the verified LMU core. It does not replace the working teacher → assignment → learner evidence → teacher review → mastery path.

## Eight specialist engines

1. **Milo Early Learning World** — touch-first early literacy, maths, social-emotional learning, creative play and guided exploration.
2. **Milo Play & Story Studio** — adaptive mini-lessons, interactive stories, puzzles, drawing and early creative learning.
3. **Milo AI Literacy & Creativity Lab** — age-leveled AI concepts, safety, bias, machine learning basics, responsible use and projects.
4. **Milo Reasoning Missions** — finite guided missions: attempt, coaching/check, retry, transfer/proof, done.
5. **Milo Voice & Language Coach** — pronunciation, listening, vocabulary, conversation and language-progress evidence.
6. **Milo Adaptive Learning Engine** — diagnostic routing, targeted practice, spacing, remediation and enrichment.
7. **Milo Coding & AI Builder** — visual coding through web/Python/AI projects according to age and readiness.
8. **Brilliant Milo Tutor** — curriculum-searchable live tutor with voice, interactive workspace, visual explanation and guided reasoning without answer dumping.

## Permanent layers

- **Learner Context**: identity, age/stage, curriculum, grade/year, classroom, skill position, mastery, misconceptions, current task, assistance state, language, consent and safety context.
- **Milo Orchestrator**: routing, curriculum retrieval, lesson planning, tutoring policy, engine selection, tool permission, session state and structured output.
- **Learning Engines**: specialist pedagogy and interaction modes.
- **Tool Layer**: whiteboard, voice, manipulatives, interactive visuals, curriculum lookup, code sandbox and evidence capture.
- **Governance**: child safety, answer-prevention, assessment guard, teacher authority, guardian consent, RLS authorization, rate limits, audit and AI/tool security.
- **Evidence/Mastery**: structured learning events feed the existing evidence, review and mastery system rather than separate progress silos.

## Protected invariants

- Milo teaches, asks, hints, models analogous examples and checks transfer; it must not complete protected learner work.
- Academic publication/review/mastery remains teacher-governed.
- Child evidence stays private and relationship-authorized.
- Consent-sensitive media remains guardian-gated.
- One learner progress record spans every engine.
- Child-facing open-web browsing is not part of the learning runtime.
- Communication is an authenticated in-app LMU capability.
- Browser/mobile clients never receive privileged server credentials.
- No production deployment occurs from Architecture 2.0 work until release gates are verified and the owner explicitly authorizes deployment.

## Delivery sequence

1. Capability matrix and contracts
2. Stabilize LMU Core/shared services
3. Milo Core Orchestrator
4. Early Learning World + Play & Story Studio
5. Reasoning + Adaptive + Voice/Language + AI Literacy
6. Coding & AI Builder
7. Brilliant Milo Tutor + unified workspace
8. Whole-platform validation, Android/Play preparation and deployment gate

See:
- [Capability matrix](./capability-matrix.md)
- [Shared contracts](./contracts.md)
- [Dependency blueprint](./dependency-blueprint.md)
- [ADR-0001](./adr-0001-milo-learning-os.md)
