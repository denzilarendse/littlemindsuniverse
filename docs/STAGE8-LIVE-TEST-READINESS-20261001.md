# Stage 8 Live-Test Readiness - 2026-10-01

## Decision

**Controlled engineering / school-pilot test candidate: READY WITH KNOWN NON-BLOCKERS.**

The Architecture 2.0 branch is ready to enter authenticated browser and physical-device test execution. It is **not approved for public production launch**. Public release remains **HOLD** until the owner-controlled and externally observed gates below are completed.

Evaluated implementation SHA: `66fd067486c5a1125c57f3642e06dfeced2a9a85`

No production deployment, DNS mutation, store submission or production promotion was performed.

## Verified evidence

| Gate | State | Evidence |
|---|---|---|
| Release verification | VERIFIED | GitHub Actions run 36902594682 succeeded on evaluated SHA |
| Android/API 36 verification | VERIFIED | GitHub Actions run 36902594707 succeeded on evaluated SHA |
| LMU Android installable test artifact | VERIFIED | `littlemindsuniverse-android-api36-debug-apk`, artifact 11181848586, sha256 `db99ad1a34cea03b8b7c9853d2c6bda9ef40fa8fcc5440c52ff87ef673f13e4c` |
| LMU Android release bundle build | VERIFIED | artifact 11181554003, sha256 `6bffb2b1d0e35f25ecdaad6daa4610397b20bf597a8a92bb068a6e469c202b73` |
| LittleMinds Connect Android build | VERIFIED | AAB artifact 11181858665 and APK artifact 11181853596 |
| Ages 2-18 routing | VERIFIED | Stage 8 regression suite maps every age 2-18 to one of six stage codes |
| 40-week structure across six stages | VERIFIED | 240 week records, exactly 40 per stage, with Saturday rest and Sunday independent authentic assessment |
| Early-stage age-appropriateness correction | VERIFIED | EE24/F57 technical-theme mismatch repaired and regression-tested |
| Reasoning Try First policy | VERIFIED | server rejects required reasoning help before declared first attempt; learner_attempt event recorded |
| Finite Milo sessions | VERIFIED | server-side tutor-turn budgets by stage |
| Voice evidence consent | VERIFIED | microphone capture is gated by live guardian audio-evidence consent state; private evidence only |
| Coding sandbox isolation | VERIFIED | bounded Web Worker; network/storage primitives disabled; timeout/termination tests |
| Brilliant Milo curriculum binding | VERIFIED | selected skill is revalidated server-side against learner curriculum/stage before session binding |
| Adaptive/Brilliant mastery context | VERIFIED | bounded read-only reviewed mastery snapshot; no Milo direct mastery writes |
| Multi-format teacher evidence review | VERIFIED | approved image/whiteboard/audio/video/text-code evidence loaded from private storage only |
| LittleMinds Connect canonical communication | VERIFIED | legacy external phone-provider runtime tables/functions/preferences removed from live DB and active UI uses Connect |
| New Stage 5-8 RPC hardening | VERIFIED | SECURITY DEFINER functions use pinned empty search_path and explicit authenticated grant with anon/PUBLIC denied |
| PayFast requirement for controlled pilot | NON-BLOCKING | payment settlement deliberately excluded from pilot entry gate; remains production gate |

## Known non-blockers for controlled test execution

- Stage 6 currently provides a safe JavaScript pilot studio, not the complete future block/Python/API/AI project ladder.
- Stage 7 provides curriculum search, current topic, current-work entry points and governed specialist tools, but the richer single-canvas/manipulative tutor UX is still an extension target.
- Full curriculum subject-by-subject accuracy and formal alignment have not been certified by an external curriculum reviewer. The structural 40-week coverage and age mismatch checks are verified.
- Supabase performance lints include unused indexes and multiple permissive policies; these require measured optimization rather than bulk changes.

## Gates not yet checked or not yet satisfied

| Gate | State | Reason |
|---|---|---|
| Authenticated browser E2E for new Stage 5-7 UI | NOT CHECKED | requires real browser/account interaction after candidate selection |
| Physical-device LMU debug APK smoke | NOT CHECKED | installable artifact now exists; requires device execution |
| Physical-device microphone permission/recording | NOT CHECKED | requires device permission prompt and guardian-consent scenario |
| Play signing / internal testing / pre-launch report | NOT CHECKED | owner Play Console and signing gate |
| Vercel deployment state | NOT CHECKED | connected Vercel integration currently exposes no teams/projects; deployment was intentionally not attempted |
| Production deployment / DNS | NOT CHECKED | explicitly outside this autonomous run |
| Leaked-password protection | FAILED / WARN | Supabase advisor reports leaked-password protection disabled |
| CAPTCHA / bot-abuse protection | NOT IMPLEMENTED | requires production auth configuration and site/provider setup |
| pg_net extension placement | WARN | Supabase advisor reports pg_net in public schema |
| SECURITY DEFINER estate review | IN REVIEW | advisor flags 70 authenticated SECURITY DEFINER functions; many are intentional RPCs. New Stage 5-8 functions were individually hardened. Bulk revocation is prohibited without call-path review. |
| Backup restore drill | NOT CHECKED | rollback plan exists but restore must be exercised against an approved environment |
| Legal / privacy / Play Data Safety / target-audience declarations | NOT CHECKED | owner/legal/store-console evidence required |
| Chronos local heartbeat | NOT CHECKED | Chronos Governor is a local-machine workflow and no user-local Chronos session is connected here |
| Codex usage/quota telemetry | NOT CHECKED | the Codex Usage workflow requires the user's local Codex machine/terminal |
| Public launch | HOLD | requires the owner-controlled and real-device/browser gates above |

## Supabase advisor snapshot

Security:
- `extension_in_public`: WARN, count 1
- `authenticated_security_definer_function_executable`: WARN, count 70
- `auth_leaked_password_protection`: WARN, count 1

Performance:
- `unused_index`: INFO, count 74
- `multiple_permissive_policies`: WARN, count 4

These warnings were not hidden or weakened to manufacture a green result.

## Stage 5-7 implementation status

### Stage 5
Implemented: stage-safe specialist routing, Reasoning Missions Try First, finite sessions, Voice/Language consent-gated capture, AI-literacy engine guidance, Adaptive Practice access to reviewed mastery context, common learning-event audit.

Remaining real-world validation: authenticated voice/reasoning/adaptive browser and device runs plus educator quality review.

### Stage 6
Implemented: bounded JavaScript Coding Studio, safe execution worker, debugging-with-Milo flow, private document evidence attachment, assignment-scoped Coding Studio entry, teacher text/code evidence preview.

Remaining extension work: full age-progressive blocks/Python/API/AI project ladder and broader physical-device test matrix.

### Stage 7
Implemented: Brilliant Milo curriculum search, Continue my curriculum, selected-skill server binding, trusted topic reload, reviewed mastery context, assignment-context entry, voice/coding/whiteboard evidence paths, multi-format teacher reviewer.

Remaining extension work: richer unified lesson canvas, manipulatives and transfer/evidence UX consolidation.

## 96-hour completion judgment

**Yes - 96 focused engineering/test hours is enough to move this codebase from the current verified candidate into controlled real-life testing, provided test accounts, devices and owner-controlled consoles are available when needed. It is not a guarantee of public launch or store approval.**

Recommended use of the 96 hours:

- **Hours 0-24:** authenticated Stage 5-7 browser E2E, repair defects, finish specialist-session UX gaps that block pilot tasks.
- **Hours 24-48:** Android debug APK install, microphone/voice consent tests, Connect messaging tests, PWA/offline/update tests, privacy/retention checks.
- **Hours 48-72:** all-six-stage scripted learner/parent/teacher scenarios, curriculum/age quality sampling, accessibility/touch/responsive regression, security advisor classification.
- **Hours 72-96:** defect repair and rerun, backup/rollback drill, pilot runbook, owner sign-off on real-life testing scope, final candidate freeze.

If any of the device, account, signing, legal or store-console gates are unavailable during that window, engineering can still complete the candidate, but those external gates remain NOT CHECKED rather than being assumed complete.

## Release boundary

The current evidence supports entering **controlled testing**, not public deployment. The next meaningful human-involved actions are authenticated browser E2E and installation of the generated LMU debug APK on a physical Android device.