# LMU Android Physical-Device Validation Plan

**Prepared:** 2026-11-17 (SAST)  
**Scope:** Pilot/debug APK installation and functional validation only.  
**Release status:** Not production signed; not Play Store ready.

## Verified build under test

- Repository: `denzilarendse/littlemindsuniverse`
- Branch: `production/lmu-blueprint-room-shell-20261117`
- Latest instrumentation-test commit: `037dbe7efc4481b66a8e4c3a8afb42e96f64b4fb`
- Android workflow: [run 44152121586](https://github.com/denzilarendse/littlemindsuniverse/actions/runs/44152121586)
- Latest APK artifact: `littlemindsuniverse-pilot-debug-apk` (ID `14359541834`)
- Artifact ZIP digest: `7db57f26a3733a9a6fadbed7eedf24d37a5203aaeae10e67724a72881327b093`
- Extracted APK: `app-debug.apk`, 4,238,778 bytes
- Latest extracted APK SHA-256: `72db16968cc54dec148101e0d0c99b7001ec852e4d59d7cd4bea39a39b3e49e2`
- Application ID: `za.co.littlemindsuniverse`
- Minimum Android SDK: 24 (Android 7.0)
- Target / compile SDK: 36
- Capacitor: 8.5.2

The artifact ZIP and extracted APK were downloaded from the Android build job. The APK archive integrity check passed. The Android build job passed; the separate API 36 emulator job is still running at the latest checkpoint. Neither result substitutes for physical-device acceptance.

## Device prerequisites

- Android 7.0 or later; preferably one current Android 14/15/16 device and one older supported device if available.
- At least 150 MB free storage.
- Reliable Wi-Fi or mobile data for first launch and authentication.
- A dedicated non-production test account and synthetic learner data only.
- Do not use real children's personal information or production learner records.
- Record device model, Android version, security patch level, screen resolution, install source and test date.
- Keep the device charged and do not disable Android security protections globally.

## Installation

1. Download the ZIP artifact from the workflow run above (Actions → Artifacts → `littlemindsuniverse-pilot-debug-apk`).
2. Extract `app-debug.apk`.
3. Transfer it to the test device using USB or a trusted private transfer method.
4. In Android Settings, permit installation from the selected file manager/browser only if Android requires it. Revoke that per-app permission after installation.
5. Install the APK and launch **LittleMindsUniverse**.
6. If an older build is installed, note that first. Do not uninstall it until any needed test-only evidence is recorded; uninstalling removes local app data.
7. Do not install this debug build over a separately signed production build: Android signing-certificate mismatch may prevent upgrade.

## Physical-device test matrix

For each case record PASS / FAIL / BLOCKED, actual result, timestamp and a redacted screenshot or screen recording only when safe.

| ID | Test | Expected result |
|---|---|---|
| P01 | Fresh install | Android accepts APK; app icon and name are correct. |
| P02 | Cold launch | App opens without crash, blank screen or repeated splash. |
| P03 | Warm relaunch | App resumes predictably; no duplicate navigation state. |
| P04 | Network unavailable at launch | Clear offline/connection state; no crash or endless spinner. |
| P05 | Network restored | App recovers and can reach its online sign-in/service surfaces. |
| P06 | Sign-in with dedicated test account | Authentication succeeds; session state is shown correctly. |
| P07 | Invalid sign-in | Safe, understandable error; no sensitive detail disclosure. |
| P08 | Sign-out and relaunch | Protected surfaces require authentication again. |
| P09 | Role navigation | Only the test account's authorised navigation is visible. |
| P10 | Academy | Lists and opens the expected test learning content. |
| P11 | Submission/review | Test-only evidence flow behaves as expected; no duplicate submission on repeat tap. |
| P12 | Milo | Chat/tutoring surface opens; network failures are recoverable. |
| P13 | Progress/mastery | Values load and remain consistent after navigation/relaunch. |
| P14 | Room demo surfaces | PlayWorld and StoryVerse demo surfaces render; no claim of live persistence. |
| P15 | Parent/teacher/admin access | Test roles see only permitted surfaces; do not test with real child data. |
| P16 | Microphone permission | No unexpected prompt at launch. If a voice feature requests it, test Allow and Deny; denial must not crash unrelated app features. |
| P17 | Back navigation | Back returns to the previous screen; no accidental app exit or navigation loop. |
| P18 | Rotation / resize | Layout remains usable in supported orientation changes. |
| P19 | Keyboard and forms | Keyboard does not obscure essential controls; focus and submit behavior work. |
| P20 | Accessibility | Text remains readable at larger font sizes; controls have usable touch targets and labels. |
| P21 | Long session | No crash, severe slowdown, repeated login or runaway battery use in a 15-minute session. |
| P22 | App background/foreground | Session and current view recover safely after switching apps and locking/unlocking. |
| P23 | App update behavior | Document whether a later same-signature pilot build updates without data loss. Do not mix signing identities. |
| P24 | Deep link | HTTPS link for `www.littlemindsuniverse.co.za` opens safely; otherwise browser fallback is acceptable. |

## Security and privacy checks

- Android manifest currently declares only `INTERNET` and `RECORD_AUDIO`; cleartext traffic is disabled and Android backup is disabled.
- Verify no unexpected permission prompt appears during install or cold launch.
- Do not grant microphone permission unless deliberately testing the relevant voice feature.
- Do not capture or share passwords, tokens, email addresses, child names, learner identifiers, private messages or personal records in screenshots/logs.
- Do not use production data for tests.
- Do not attempt to test or enable live room writes: backend room persistence remains gated on schema baseline and security verification.
- Do not infer that a green emulator run establishes physical device, Play Integrity, signing or Play Store readiness.

## Results record

Copy and complete this block for each device:

- Device model:
- Android version / API:
- Security patch:
- Screen size / resolution:
- Install date/time:
- APK SHA-256 verified:
- Test account role (no identifier):
- Passed IDs:
- Failed IDs:
- Blocked IDs:
- Crash / ANR observed:
- Permission prompts observed:
- Network conditions:
- Redacted evidence location:
- Overall result: PASS / PASS WITH ISSUES / FAIL

## Exit criteria

Physical-device pilot validation passes only when P01–P24 have been exercised or explicitly marked not applicable with a reason, there are no crash/ANR or child-safety blockers, and all failures have reproducible evidence and tracked fixes. This is a pilot acceptance gate, not production release approval.

## Current state

- CI Android lint/unit/instrumentation compilation: PASS.
- API 36 emulator execution: PASS.
- APK downloaded and ZIP integrity checked: PASS.
- Physical-device install and functional tests: NOT YET RUN.
- Production signing / Play Store submission: NOT DONE.
