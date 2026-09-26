# LittleMindsUniverse Release Evidence — 27 September 2026

## Decision

**RELEASE HOLD — the canonical source, automated regression/build gates, Netlify production deployment, external production-domain probe and unsigned Android API-36 candidate are green. Hosted authenticated role E2E, PayFast provider-backed settlement, backup/restore/rollback, owner signing, physical-device testing and Play Console release gates remain unevidenced.**

The release standard remains:

`discover defect -> isolate root cause -> repair -> regression test -> retest -> record evidence`

A successful deployment is not by itself a public-launch or store-release decision.

## Canonical source

- Repository: `denzilarendse/littlemindsuniverse`
- Branch: `main`
- Exact production source SHA: `274a74629c0fc354d4363dac00c88013bcac1c39`
- Production host: Netlify project `littlemindsuniverse-app`
- Netlify project ID: `989d3b15-5ba4-42f7-8ba6-b53dc64fbd27`
- Production URL: `https://www.littlemindsuniverse.co.za`
- Netlify deploy ID: `6ab84e0bb245cd33886dc51f`
- Unique deploy URL: `https://6ab84e0bb245cd33886dc51f--littlemindsuniverse-app.netlify.app`

## Source and CI verification

The final source SHA was verified before production deployment.

- Main release-verification run `36275489198`: PASS.
- Main Android-verification run `36275489182`: PASS.
- Vercel commit status for the same source SHA: PASS.
- Local clean Termux release checkout on the exact source SHA: PASS.
- Local automated suite: 124 tests passed, 0 failed.
- Production smoke tests: PASS.
- Production build: PASS, with 17 static production files built into `dist/`.
- Required manual-deploy security artifact `dist/_headers`: present.
- `dist/index.html`, `dist/connect.html`, `dist/manifest.json` and `dist/sw.js`: present.

The local dependency install reported three moderate npm advisories. The release workflow's explicit shipped-runtime audit and high-severity rejection gate passed. No breaking `npm audit fix --force` was applied merely to obtain a zero-warning count.

## Netlify production deployment

The production folder was linked to the existing Netlify project rather than creating a replacement site.

The first Android-shared-storage deployment attempts exposed environment-specific filesystem restrictions:

1. Netlify UI Lighthouse plugin installation failed because Android shared storage rejected npm-created symlinks.
2. A no-build deployment from shared storage still failed during Netlify Functions bundling because the function entry points could not be resolved correctly from that filesystem boundary.

The release checkout was then recreated under Termux private Linux storage. There:

- `npm ci --ignore-scripts`: PASS;
- full `npm run check`: PASS;
- existing Netlify project link: PASS;
- production no-build deployment of the already-verified `dist/` plus `netlify/functions`: PASS;
- 17 static files and 5 functions were hashed and uploaded;
- Netlify reported `Production deploy is live` for `https://www.littlemindsuniverse.co.za`.

This repaired the deployment path without modifying or weakening application security checks.

## Independent external production probe

A fresh GitHub-hosted Ubuntu 24.04 probe was triggered after the Netlify production deploy.

- Workflow: `production-domain-probe`
- Run: `36278055418`
- Job: `108504498678`
- Result: PASS

Observed external evidence:

- `www.littlemindsuniverse.co.za` resolves through `littlemindsuniverse-app.netlify.app`.
- HTTPS root response: HTTP 200 from Netlify.
- TLS: TLS 1.3; certificate valid through 13 December 2026 at probe time.
- Root security headers: PASS, including CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, Referrer Policy, Permissions Policy and COOP.
- `/`: HTTP 200 and current LittleMindsUniverse application shell present.
- `/connect.html`: HTTP 200 and LittleMinds Connect shell present.
- `/manifest.json`: HTTP 200; `name=LittleMindsUniverse`, `start_url=/`, `display=standalone`.
- `/sw.js`: HTTP 200; explicit cache allowlist and cross-origin cache boundary present.
- `/assets/runtime-config.js`: HTTP 200; browser-safe environment and Supabase publishable configuration present; no server-secret variable patterns surfaced by the probe.
- `/api/health`: HTTP 200 with `ok=true`, service `littlemindsuniverse`, Connect configured, Milo configured.
- Production verifier result: `Production probe PASS: https://www.littlemindsuniverse.co.za`.

The health endpoint reported `payfastConfigured=false`. The production probe intentionally does not require PayFast to pass the web/Connect/Milo hosting gate, so PayFast remains a separate release gate rather than being hidden by the green production-domain result.

## Production-domain gate transition

The production-domain gate has moved from **UNKNOWN / stale deployment** to **PASS for external DNS, TLS, static shells, security headers, PWA boundary, runtime config, Connect and Milo server readiness** on the deployed candidate.

This materially closes the previous hosting blocker. It does not prove authenticated multi-role workflows or payment settlement.

## Android/API-36 status

The Android application identity remains frozen as:

`za.co.littlemindsuniverse`

The main Android verification pipeline is green and produces an unsigned API-36 release bundle. Owner signing material remains deliberately outside source control. No claim is made that a signed AAB has been produced, installed on a physical device, uploaded to Play, passed pre-launch testing or received store approval.

## Remaining release gates

| Gate | State | Evidence still required |
| --- | --- | --- |
| Canonical source / exact production SHA | PASS | Keep release evidence tied to exact SHA |
| Automated lint/tests/smoke/build | PASS | Repeat if source changes |
| Netlify production deployment | PASS | Repeat if deploy artifact changes |
| Production DNS / TLS / security headers | PASS | Repeat if hosting/DNS changes |
| LMU root shell | PASS | Authenticated behavior still separate |
| LittleMinds Connect hosted shell | PASS | Real parent/teacher/realtime role E2E |
| PWA manifest/service-worker privacy boundary | PASS externally | Real install/update/offline exercise on device |
| Runtime browser configuration | PASS | Keep server secrets absent from public bundle |
| Milo server health | PASS | Real authenticated role/context E2E still required |
| Connect server health | PASS | Real authenticated relationship negative/positive E2E |
| Hosted auth lifecycle | OPEN | Learner/parent/teacher/admin login, recovery, logout and role isolation |
| Hosted browser/mobile E2E | OPEN | Work/submission/review/reporting/Connect flows on production candidate |
| PayFast automated logic | PASS at automated layer | Provider-backed sandbox/live settlement + entitlement evidence |
| PayFast production configuration | OPEN | Health currently reports `payfastConfigured=false` |
| Backup / restore / rollback | OPEN | Successful recovery and rollback drill with recorded result |
| Supabase Auth leaked-password protection | OPEN HARDENING | Enable through supported project configuration and verify |
| `pg_net` public-schema advisor | REVIEWED | Managed-extension-safe remediation or documented accepted platform constraint |
| Android package ID / API-36 unsigned bundle | PASS | Keep final candidate tied to final source |
| Android owner signing | OPEN OWNER GATE | Owner upload key / Play App Signing evidence |
| Digital Asset Links | PREPARED | Play app-signing SHA-256, publication and verification |
| Signed Android AAB | OPEN OWNER GATE | Sign exact final candidate and verify signature |
| Physical-device release test | OPEN | Install and exercise exact signed artifact |
| Play internal/closed/pre-launch | OPEN OWNER GATE | Console upload, testers and pre-launch report |
| Play declarations / production approval | OPEN OWNER GATE | Families, target audience, Data Safety, deletion/privacy and store review evidence |

## Current conclusion

The stale Netlify deployment blocker is closed. The production domain now serves the current LMU release candidate with the expected security boundary, LittleMinds Connect shell, PWA assets, runtime configuration and Netlify Functions health path.

The next release work should concentrate on hosted authenticated role E2E, PayFast provider configuration/settlement evidence, recovery/rollback proof, and then owner-controlled Android signing/device/Play gates. Until those are observed, the evidence-based overall decision remains **RELEASE HOLD**.
