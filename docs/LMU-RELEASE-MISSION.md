# LittleMindsUniverse Release Mission

This mission is project-specific and does **not** modify the frozen general-purpose 8/8 v1.0.0 skill.

## Evidence rule
A gate is PASS only when the relevant command, runtime test, external verification, or owner-controlled platform state has been observed. Owner authorization permits an action; it does not substitute for technical evidence. Security conditions must not be weakened to manufacture a green result.

## Strict release sequence
1. Repository discovery
2. Canonical repository
3. Clean build
4. Tests
5. RLS/security verification
6. Payments
7. Production backend
8. Production domain/HTTPS
9. Browser/mobile E2E
10. PWA/service-worker/update/offline
11. Freeze Android application ID
12. Establish owner-controlled signing
13. Publish and verify Digital Asset Links
14. Confirm current Google Play target API requirement
15. Build signed AAB
16. Physical-device release-artifact test
17. Play internal testing / pre-launch report
18. Resolve findings
19. Production submission
20. Respond to Play review findings until approved

## Branching rule
If one branch is blocked by an owner/account/legal/device action, record the exact minimum action and continue every independent branch. Do not claim a blocked branch completed.

## Current source hierarchy
1. Current release branch / uploaded September repository snapshot
2. Live Supabase schema and policies
3. Canonical GitHub history
4. Library historical/reference material

Historical files are guidance and migration sources; they do not override newer verified live state.

## Production invariants
- Browser/mobile code uses only the Supabase publishable credential; server secret credentials never ship to clients.
- Authentication and authorization are separate controls.
- Classroom/guardian membership tables are authorization boundaries and cannot be freely self-mutated.
- Payment identity, price, FX policy, duration, settlement state, and entitlement are server-authoritative.
- Payment creation is never treated as settlement.
- PayFast ITNs are independently verified and processed idempotently before entitlement.
- WhatsApp destinations/templates are resolved from verified relationships, consent, and server-side event mappings; callers cannot choose arbitrary destinations/templates.
- Milo does not replace teacher authority; assessment assistance restrictions remain enforced.
- Week 1 remains free; trial/premium state is determined by backend access logic.

## Owner-only gates
Owner/account action is expected for Vercel team authorization, final Android signing/Play App Signing ownership, Play Console declarations/submission, and any legal/privacy declarations that require the business owner. These gates must remain UNKNOWN/BLOCKED until evidenced.

## Canonical release candidate
- Canonical repository: `denzilarendse/littlemindsuniverse`
- Verified source branch: `release/lmu-20260922-source`
- Provenance branch: `release/lmu-20260922-rc1`
- The source branch must pass its own clean GitHub Actions workflow before it is eligible for merge or deployment.
