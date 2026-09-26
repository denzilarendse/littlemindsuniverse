# LittleMindsUniverse Release Mission

This mission is project-specific and does **not** modify the frozen general-purpose 8/8 v1.0.0 skill.

## Evidence rule
A gate is PASS only when the relevant command, runtime test, external verification, or owner-controlled platform state has been observed. Owner authorization permits an action; it does not substitute for technical evidence. Security conditions and meaningful tests must not be weakened to manufacture a green result.

The engineering target is an evidence-earned manufactured pass:

`discover defect -> isolate root cause -> repair -> add/retain regression coverage -> retest -> record evidence`

## Strict release sequence
1. Repository discovery and canonical source
2. Clean install/build/test verification
3. Live RLS/RPC/storage/security verification
4. LittleMinds Connect backend and web runtime verification
5. Payments and entitlement verification
6. Production backend/environment configuration
7. Production domain/HTTPS verification
8. Authenticated browser/mobile E2E for learner, parent, teacher and admin
9. PWA/service-worker install, update and offline verification
10. Backup/restore/rollback evidence
11. Freeze Android application ID
12. Establish owner-controlled signing
13. Publish and verify Digital Asset Links
14. Confirm the current Google Play target API requirement
15. Build signed AAB
16. Physical-device release-artifact test
17. Play internal testing / pre-launch report
18. Resolve findings
19. Production submission
20. Respond to Play review findings until approved

## Branching rule
If one branch is blocked by an owner/account/legal/device action, record the exact minimum action and continue every independent branch. Do not claim a blocked branch completed.

## Current source hierarchy
1. `main` in `denzilarendse/littlemindsuniverse`
2. Live Supabase schema, policies and applied migrations
3. Verified GitHub CI/deployment evidence for the exact source SHA
4. Library and historical repository material as reference/migration evidence

Historical files are guidance and migration sources; they do not override newer verified live state.

Generated `dist/` output is not canonical source and is rebuilt by CI/hosting from the repository.

## Production invariants
- Browser/mobile code uses only the Supabase publishable credential; server secret credentials never ship to clients.
- Authentication and authorization are separate controls.
- Classroom/guardian membership tables are authorization boundaries and cannot be freely self-mutated.
- Guardian reads require a verified, row-correlated relationship plus the relevant permission where one exists.
- Learner evidence stays in private storage and uses explicit learner/guardian/teacher authorization.
- LittleMinds Connect owns LMU communication; WhatsApp is historical only and is not a launch dependency.
- Connect relationship authorization, not phone-number or username discovery, determines who can communicate.
- Learner Connect accounts remain notification/read-only unless a separately reviewed age-safe interaction policy enables more.
- Payment identity, price, FX policy, duration, settlement state and entitlement are server-authoritative.
- Payment creation is never treated as settlement.
- PayFast ITNs are independently verified and processed idempotently before entitlement.
- Milo does not replace teacher authority; assessment assistance restrictions remain enforced.
- Week 1 remains free; trial/premium state is determined by backend access logic.

## Owner-only / external-evidence gates
Owner/account action may be required for final production-domain/DNS evidence, PayFast provider approval or live credentials, Android signing/Play App Signing ownership, Play Console declarations/submission, Apple/Windows store accounts, and legal/privacy declarations that require the business owner. These gates remain UNKNOWN/BLOCKED until evidenced.

## Canonical release candidate
- Repository: `denzilarendse/littlemindsuniverse`
- Canonical branch: `main`
- Current evidence record: `docs/RELEASE-EVIDENCE-20260926.md`
- Every release decision must name the exact source SHA it evaluates.
