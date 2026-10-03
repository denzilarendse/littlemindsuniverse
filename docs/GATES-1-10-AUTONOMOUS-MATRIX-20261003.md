# Gates 1–10 autonomous attack matrix — 3 October 2026

Evidence states: EXECUTED PASS, VERIFIED, BLOCKED, NOT RUN, RELEASE HOLD.

| Gate | Current state | Autonomous work |
|---|---|---|
| 1 Physical Android pilot | BLOCKED on human hardware | API-36 emulator already green; instrumentation expanded for orientation and default microphone denial; physical runbook added. |
| 2 Fresh-account survival | VERIFIED backend / BLOCKED rendered-email E2E | Live synthetic Auth trigger probe created parent profile + 7-day trial and was fully removed; rendered email-confirmation journey still needs browser/human mailbox. |
| 3 Supabase security | VERIFIED with known warnings | 48/48 public tables RLS; browser-callable SECURITY DEFINER RPCs anon-denied and auth.uid-bound; pg_net disposition documented; leaked-password protection requires Auth plan/config action. |
| 4 Backup/restore/deletion | VERIFIED deletion design / BLOCKED restore drill | Public deletion resource promoted; restore runbook added; actual hosted backup/clone evidence requires provider plan/dashboard. |
| 5 Human usability | VERIFIED static wiring / BLOCKED human observation | Action wiring/regression suite exists; physical pilot runbook captures hesitation, focus, clipping, permissions and navigation. |
| 6 Controlled pilot | PREPARED | Six age bands, pilot feedback channel, APK pipeline and defect severity model prepared; requires real testers. |
| 7 Final Android signing | BLOCKED owner signing asset | CI builds unsigned AAB plus installable pilot APK; owner signing keys remain outside chat/source by design. |
| 8 Play closed testing | PREPARED / BLOCKED Play Console | Current policy checklist, privacy/deletion web resources and Data Safety preparation added; Play App Signing/internal track remain external. |
| 9 Production release | RELEASE HOLD | Source/deployment engineering can continue, but public/mobile promotion waits for critical pilot/signing/Play gates. |
| 10 Post-launch operations | PREPARED / BLOCKED real launch | Monitoring/incident/rollback runbook added; operational evidence requires real release traffic. |
