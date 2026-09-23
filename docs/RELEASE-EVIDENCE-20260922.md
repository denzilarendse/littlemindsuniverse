# LittleMindsUniverse release evidence — 2026-09-22

This is a LittleMindsUniverse mission record. It does not modify or replace the frozen general-purpose 8/8 v1.0.0 skill.

## Evidence rules
- PASS means the relevant command, query, runtime check, or provider state was actually observed.
- Owner authorization never substitutes for technical evidence.
- Tests are not weakened and security rules are not relaxed to manufacture green results.
- Rollback-only database tests are explicitly identified as such.

## Repository and build
- Canonical repository: `denzilarendse/littlemindsuniverse`.
- Canonical release source branch: `release/lmu-20260922-source`.
- Provenance branch: `release/lmu-20260922-rc1`.
- Release PR: `#2` remains draft until production gates pass.
- Actual stack discovered: static/PWA frontend + Vercel Functions + Supabase; not Next.js.
- Package manager: npm with committed `package-lock.json`.
- Local clean install/check: PASS (`npm ci --ignore-scripts`, then `npm run check`).
- Automated suite: 13 tests PASS plus smoke test and production static build.
- GitHub Actions clean verification on the normalized source branch: PASS.

## Supabase authorization/security
Live project: `LittleMindsUniverse` (`zcokxljcsfkrlouzragv`).

Rollback-only negative authorization tests observed:
- unrelated authenticated user sees zero learner rows: PASS;
- learner sees own learner record only: PASS;
- verified guardian sees linked learners only: PASS;
- teacher sees the active learner in the teacher's classroom but not an unrelated learner: PASS;
- authenticated user cannot manufacture a verified guardian link: PASS (denied);
- teacher cannot insert an arbitrary learner into classroom membership: PASS (denied).

Additional privilege checks:
- anonymous users can execute zero `SECURITY DEFINER` functions: PASS;
- authenticated `SECURITY DEFINER` functions with data access/mutation all contain an `auth.uid()` check or an authorization helper in the inspected live schema: PASS for this audit heuristic;
- direct authenticated profile UPDATE is not granted, and a role-protection trigger exists: PASS.

Supabase advisor warnings about authenticated `SECURITY DEFINER` functions remain visible and are not being hidden. Their presence is not being treated as an automatic failure where the function intentionally performs its own authorization.

## Payments
The existing active USD billing rows are unchanged by release work.

Rollback-only live settlement tests observed:
- COMPLETE settlement grants exactly one entitlement: PASS;
- duplicate delivery with the same PayFast payment identifier is idempotent: PASS;
- replay with a different payment identifier against an already-paid order is rejected: PASS;
- PENDING payment grants no entitlement: PASS;
- amount mismatch is rejected and grants no entitlement: PASS.

Automated API tests also prove that provider validation must return `VALID` before settlement finalization is invoked and that a provider-rejected ITN cannot reach the finalizer.

Still open: real PayFast sandbox/provider callback delivery and provider-origin verification against deployed production/preview infrastructure.

## WhatsApp
- caller cannot choose arbitrary recipient/template in tested API path: PASS;
- teacher authorization is enforced before provider call: PASS;
- live dispatch reservation ledger is idempotent in rollback-only database testing: PASS.

Still open: real Meta/WhatsApp Business provider delivery from the deployed backend.

## PWA
Static/automated evidence:
- manifest/install shell: PASS;
- service worker caches application shell: PASS;
- service worker bypasses `/api/`: PASS;
- service-worker registration is present in application JS: PASS.

Still open: deployed browser/mobile installation, service-worker update transition, cache invalidation, and intended offline behavior.

## Production blockers
### Vercel account scope
The connected Vercel integration returned HTTP 403 for team scope `denzilarendses-projects`. Minimum owner action: re-authorize the Vercel connection for that team/project scope. Do not expose or paste tokens into source or chat.

### Production domain
`https://littlemindsuniverse.co.za` and `https://www.littlemindsuniverse.co.za` were not externally reachable from the available web check, and the working environment could not resolve their DNS names. This is recorded as **HTTPS/DNS NOT VERIFIED**, not as a claim that the registration is absent.

## Android / Play
Not started as a release gate yet because the strict sequence requires production web + deployed E2E + PWA verification first. No application ID, signing state, Digital Asset Links, AAB, device test, internal-track result, or Play approval is claimed.
