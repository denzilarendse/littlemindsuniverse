# LittleMindsUniverse Release Evidence — 26 September 2026

## Decision

**RELEASE HOLD — source/build/live-audited security, accessibility/PWA source hardening and unsigned Android release-candidate layers are green; hosted authenticated E2E, recovery, owner signing, physical-device and store gates remain unevidenced.**

The engineering standard remains an evidence-earned manufactured pass:

`discover defect -> isolate root cause -> repair -> regression test -> retest -> record evidence`

A green source build, a successful hosting status or an unsigned Android bundle is not by itself a public-launch or store-release decision.

## Canonical source evaluated

- Repository: `denzilarendse/littlemindsuniverse`
- Canonical branch: `main`
- Exact source SHA evaluated in this record: `efc14c1d003e4e51686c9c81d925cc04e99704db`
- Generated `dist/` is not canonical source; CI/hosting rebuilds it.
- Live Supabase project: the configured LMU production project, audited separately from source tests.

## Current green evidence

### Repository / source verification

Main release-verification run `36273655167` completed successfully on `efc14c1d...`:

- locked dependency install: PASS
- shipped runtime dependency audit: PASS
- high-severity dependency rejection: PASS
- syntax/lint: PASS
- complete automated regression + smoke suite: PASS
- production web build: PASS
- deployable-artifact backup-file guard: PASS

Vercel commit status for the same source SHA reports success. This confirms the configured Vercel build/status path, not the custom-domain or real-account runtime gates.

### LittleMinds Connect / WhatsApp retirement

- LittleMinds Connect is the canonical relationship-authorized communication layer.
- The standalone `/connect.html` surface and the embedded LMU bridge use the Connect RPCs.
- Parent/teacher messaging authorization is based on active classroom membership, verified guardian relationship and role checks rather than phone-number discovery.
- Learner accounts do not receive an unrestricted classroom message composer in the current release candidate.
- WhatsApp provider endpoints/secrets are retired and are not a release dependency.
- Historical provider data/migrations are preserved rather than rewritten or deleted merely to make tests pass.

### Live Supabase security evidence

Observed on the live project during this release audit:

- the six Connect tables have RLS enabled;
- authenticated direct table access for those Connect tables is read-only/SELECT-scoped, with mutations routed through reviewed RPCs;
- the relevant learner-evidence storage bucket is private;
- Connect SECURITY DEFINER RPCs have pinned `search_path=public, pg_temp` in the audited set;
- PUBLIC/anon execution is denied on the audited Connect SECURITY DEFINER functions;
- the internal `connect_classroom_relationship_active(uuid)` relationship predicate was confirmed to be called only by the higher-level membership/send guards, not by the browser clients;
- direct EXECUTE on that internal helper was revoked from PUBLIC, anon and authenticated after source regression tests and CI were green;
- live verification confirms `connect_is_member` and `connect_can_send` remain callable by authenticated users while the nested relationship predicate is no longer a direct RPC surface.

The Supabase SECURITY DEFINER advisor count decreased from 58 to 57 after that privilege reduction. The remaining warnings are not being bulk-silenced: many are intentional client-facing authorization RPCs and require function-by-function classification before any further privilege change.

Two other advisor findings remain open:

1. `pg_net` is reported in the public extension schema. Live catalog inspection shows the installed extension is **not relocatable**, so it has deliberately not been moved/dropped/reinstalled merely to silence the warning.
2. Supabase Auth leaked-password protection is disabled. This remains a configuration hardening gate to enable through the supported Auth/project configuration surface.

### Accessibility and PWA source hardening

The LMU and LittleMinds Connect shells now share an explicit accessibility-hardening layer. Source regression coverage checks:

- document language and mobile viewport metadata;
- polite/atomic live-region semantics for status feedback;
- semantic primary navigation and main landmark presence;
- visible keyboard focus treatment;
- checked 44px primary-control touch-target floor;
- reduced-motion handling;
- forced-colors/high-contrast handling.

This is a source/runtime baseline, not a claim of full WCAG certification or assistive-technology device testing.

The service worker now precaches both the LMU and Connect static shells and has an explicit data boundary:

- cross-origin requests are not intercepted or placed in Cache Storage;
- same-origin `/api/` requests are not intercepted;
- runtime caching is restricted to the explicit static `CORE` allowlist;
- the cache generation advanced to `lmu-production-v9`, causing the previous generation to be deleted on activation;
- offline navigation preserves the dedicated Connect shell for `/connect` / `/connect.html` and the LMU shell for other navigation.

This specifically prevents authenticated Supabase REST/Storage GET responses from being persisted by the PWA service-worker cache.

### Android/API-36 release-candidate evidence

The Android identity is frozen as:

`za.co.littlemindsuniverse`

Main Android verification run `36273655182` completed successfully on `efc14c1d...`:

- Node 22/JDK 21 setup: PASS
- shipped runtime dependency audit: PASS
- full web source verification before packaging: PASS
- Capacitor production bundle sync: PASS
- package identity / SDK / child-safe native defaults: PASS
- Android lint: PASS
- local unit tests: PASS
- app-scoped instrumentation-test APK compilation: PASS
- API-36 release bundle generation: PASS
- unsigned AAB artifact upload: PASS

The exact main workflow artifact is `littlemindsuniverse-android-api36-unsigned` (artifact id `10916740215`), with GitHub artifact digest:

`sha256:e48a2ba04b1375b36000f8f40d59c988b21760fec701acc971c8874a348ebf90`

The extracted `app-release.aab` SHA-256 is:

`f48c87538e0ac5b26a35f2ce40728a3906834e014d8eca6e12ea171928165630`

Independent inspection of that exact AAB confirmed:

- packaged Capacitor application ID is `za.co.littlemindsuniverse`;
- environment metadata is `release-candidate`;
- family display pricing metadata is USD 3 monthly / USD 30 annual / USD 1 introductory, matching the observed live billing-plan state while checkout authority remains server/database-side;
- LittleMinds Connect and shared accessibility assets are present in the packaged web payload;
- packaged service worker is `lmu-production-v9` with the explicit static cache allowlist;
- no server-secret key variable patterns were found in the packaged public web assets.

The bundle remains intentionally unsigned at the CI stage. Owner-controlled signing support uses an ignored local `android/key.properties`; no key/password is committed. The Android manifest declares the canonical HTTPS app-link host with `android:autoVerify="true"`, and the repository contains a deterministic Digital Asset Links generator that rejects malformed/placeholder certificate fingerprints. See `docs/ANDROID-OWNER-SIGNING.md`.

### Exact-AAB browser/mobile payload check

The earlier exact-AAB web payload was rendered in headless Chromium at desktop and mobile viewports as an artifact-level browser check. That evidence remains useful for the UI path, but **does not replace hosted authenticated E2E or physical Android WebView testing**.

Observed PASS results included:

- all eight primary navigation controls rendered and activated on desktop/mobile;
- demo role switching across teacher, parent, admin and learner continued rendering non-empty UI;
- checked mobile primary controls met the touch-target floor and the tested core shell had no page-level horizontal overflow;
- LittleMinds Connect signed-out form rendered on desktop/mobile;
- Connect email/password fields did not overlap;
- failed-auth feedback surfaced visibly in the deterministic test harness;
- Connect mobile shell had no tested page-level horizontal overflow.

## Red -> repair -> green history retained

1. Initial Connect smoke still expected the removed WhatsApp API; the stale test expectation was repaired and full CI rerun.
2. Vercel configuration still referenced the deleted WhatsApp function; the stale function entry was removed and regression-tested.
3. Standalone Connect exposed stale/over-broad test assumptions around entitlement copy and PWA cache revision; tests were corrected to assert the actual behavior.
4. Live RLS review found a guardian self-correlation defect; the executable predicate was repaired, regression coverage added and CI rerun.
5. Guardian read paths that lacked an explicit `verified=true` requirement were hardened and retested.
6. An Android native test package still used the generated Capacitor identity; the package/assertion was moved to `za.co.littlemindsuniverse` and app-scoped instrumentation compilation was added to CI.
7. Android instrumentation compilation exposed Kotlin duplicate-class conflicts when compiling plugin instrumentation suites. The gate was narrowed to `:app:assembleDebugAndroidTest`, which compiles the LMU app instrumentation target without pretending third-party plugin test suites are LMU tests; lint/unit/app instrumentation/AAB all reran green.
8. Supabase advisor review identified an internal Connect relationship predicate that did not need direct client EXECUTE. Direct execution was revoked after source CI, then applied and reverified live; the higher-level authorization guards remained intact.
9. Accessibility/offline hardening bumped the PWA cache generation. The first verification run failed because two existing tests hard-coded the prior cache version. Root cause was stale fixture specificity, not a runtime regression. Those tests were made version-agnostic while continuing to require a versioned cache; full release and Android verification then returned green before merge.
10. The final offline sweep found a real privacy defect: the service worker excluded `/api/` but could still intercept and cache successful cross-origin authenticated GET responses such as Supabase REST/Storage traffic. The worker was changed to ignore all cross-origin requests and cache only the explicit static allowlist, the cache generation was bumped to invalidate the previous cache, regression coverage was added, and full web/Android/Vercel verification returned green before merge.

At no point was a meaningful authorization condition, RLS rule or product safety restriction weakened merely to obtain green status.

## Remaining release gates

| Gate | Current state | Evidence still required |
| --- | --- | --- |
| Canonical repository / exact SHA | PASS | Keep every release decision tied to an exact SHA |
| Clean install / lint / tests / web build | PASS | Re-run on final release SHA |
| Live Connect RLS/RPC/storage audited scope | PASS | Repeat negative role tests during hosted authenticated E2E |
| LittleMinds Connect source/runtime foundation | PASS | Hosted real-account parent/teacher/realtime E2E |
| WhatsApp retirement | PASS | Do not reintroduce provider dependency |
| Vercel build/status integration | PASS | Does not replace production-domain runtime verification |
| Accessibility source baseline | PASS | Real browser/device keyboard, screen-reader/high-contrast and responsive evidence |
| PWA static shell + cache privacy boundary | PASS at source/build layer | Actual hosted install/update/offline exercise on real browser/device |
| Exact packaged AAB source payload | PASS | Physical Android WebView behavior still required |
| PayFast automated verification/ITN logic | PASS at automated layer | Provider-backed sandbox/live settlement + entitlement evidence |
| Production domain / HTTPS | UNKNOWN | External DNS/TLS/fetch evidence for exact production candidate |
| Hosted auth lifecycle | UNKNOWN | Real learner/parent/teacher/admin test sessions incl. recovery |
| Hosted browser/mobile E2E | UNKNOWN | Role isolation, work/submission/review/reporting/Connect/payment on deployed candidate |
| Backup / restore / rollback | UNKNOWN | Successful recovery/rollback drill and recorded outcome |
| Supabase leaked-password protection | OPEN HARDENING | Enable through supported project Auth configuration and verify |
| `pg_net` public-schema advisor | REVIEWED / NOT BLINDLY CHANGED | Managed-extension-safe remediation or documented accepted platform constraint |
| Android application ID | PASS / FROZEN | Keep `za.co.littlemindsuniverse` permanent |
| Android target API / unsigned AAB | PASS | Repeat on final signed SHA |
| Android owner signing plumbing | PREPARED | Owner upload key + Play App Signing evidence |
| Digital Asset Links plumbing | PREPARED | Play app-signing SHA-256, generated file, production publication + verification |
| Signed AAB | BLOCKED on owner key action | Sign exact final candidate and verify signature |
| Physical-device release test | BLOCKED | Install/exercise exact signed artifact on physical device |
| Play internal/pre-launch | BLOCKED | Play Console upload, internal/closed testing and pre-launch report |
| Play declarations / production approval | BLOCKED | Families/target audience/Data Safety/deletion/privacy/store review evidence |
| Apple / Windows Connect packages | FUTURE RELEASE TRACK | Separate identity/signing/store release gates |

## Minimum owner input when autonomous work reaches the hard gate

The repository is prepared for owner-controlled Android signing without storing secrets. When independent engineering work is exhausted, the next owner action is to generate/protect the upload key in Termux (or another owner-controlled environment), then later provide the **Google Play app-signing certificate SHA-256** so Digital Asset Links can be generated and published.

Other external inputs may still be required for real hosted role credentials, PayFast provider-backed settlement evidence, production-domain access/verification, Supabase Auth leaked-password protection if no supported connector control is available, and Play Console declarations/submission.

Until those external gates are observed, the correct overall decision remains **RELEASE HOLD**, with the independent engineering layers above genuinely green.
