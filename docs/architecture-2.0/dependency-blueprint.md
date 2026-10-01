# Architecture 2.0 dependency blueprint

## Current verified platform foundation

The canonical repository is `denzilarendse/littlemindsuniverse`, branch `main`. The repository already contains:
- role-aware web/PWA frontend;
- Capacitor Android wrapper;
- Supabase live integration;
- classroom and assignment workflows;
- private evidence storage;
- whiteboard persistence;
- atomic learner submission;
- teacher private evidence viewer;
- teacher review and mastery synchronization;
- parent/guardian evidence and feature controls;
- in-app LittleMinds Connect messaging foundation;
- PayFast production layer;
- CI/release verification documentation.

Architecture 2.0 must build on these foundations instead of starting over.

## Stage dependencies

```text
Stage 1 Contracts
      |
      v
Stage 2 LMU Core Stabilization
      |
      +--------------------------+
      |                          |
      v                          v
Stage 3 Milo Orchestrator   Shared UI/tool primitives
      |                          |
      +------------+-------------+
                   |
          +--------+--------+
          |                 |
          v                 v
Stage 4 Early Years     Stage 5 Shared Engines
          |                 |
          +--------+--------+
                   |
                   v
          Stage 6 Coding/AI
                   |
                   v
          Stage 7 Brilliant Milo
                   |
                   v
          Stage 8 Whole-platform gate
```

## Stage 1 exit criteria

- eight-engine capability matrix approved by architecture evidence;
- common contracts defined;
- current repository/Supabase baseline recorded;
- external-product patterns separated from LMU-owned design;
- privacy and safety constraints explicit;
- no implementation dependency requires copying proprietary content.

## Stage 2 work queue

1. Re-run current repository CI baseline against exact SHA.
2. Re-run Supabase security/performance advisors.
3. Classify each authenticated SECURITY DEFINER function as intended public RPC vs internal helper.
4. Resolve any new release-critical advisor findings with regression tests.
5. Remove retired communication surfaces from active UI where any remain.
6. Harden whiteboard retry/orphan-object behavior.
7. Complete consent-aware Camera/Video/Mic/Attach evidence path.
8. Complete authentication recovery/CAPTCHA/security alert path.
9. Keep current assignment/review/mastery E2E green.

## Stage 3 work queue

- create Milo session/context service boundary;
- implement curriculum resolver;
- implement engine registry/router;
- implement TutorPolicy/assessment guard;
- implement ToolPermission broker;
- emit structured LearningEvents;
- introduce server-side model/provider adapter;
- add prompt-injection/untrusted-context defenses;
- add observability without storing unnecessary child content;
- preserve teacher governance.

## Data evolution principle

Prefer additive, versioned tables/functions over destructive rewrites. Candidate additions are expected around:
- Milo sessions;
- learning events;
- tutor policy decisions;
- engine runs;
- tool authorizations;
- curriculum graph metadata;
- safety events;
- adaptive recommendations.

Do not create these tables until Stage 2 verifies existing schema relationships and Stage 3 contracts are mapped to concrete authorization policies.

## Deployment gate

Architecture 2.0 is not deployable merely because code builds. Stage 8 must verify:
- exact source SHA;
- lint/tests/build;
- database/RLS/RPC;
- child-safety evaluations;
- authenticated browser/mobile E2E;
- PWA/install/update/offline;
- Android signed release candidate;
- physical-device behavior;
- current Play requirements and declarations;
- backup/restore/rollback;
- production configuration;
- provider-backed payment/auth/recovery where launch scope requires them.

Final state is RELEASE READY, RELEASE READY WITH KNOWN LIMITATIONS, or RELEASE HOLD.
