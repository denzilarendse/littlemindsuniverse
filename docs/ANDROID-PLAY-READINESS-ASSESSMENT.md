# Android Play Readiness Assessment

**Scope:** Engineering and policy preflight only. No Play Store publication or track rollout is authorised.

## Current source baseline

- App ID: `za.co.littlemindsuniverse`
- Capacitor: 8.5.2
- minSdk: 24
- compileSdk / targetSdk: 36
- Native manifest permissions: INTERNET and RECORD_AUDIO only
- Android backup disabled.
- Cleartext HTTP disabled.
- Release signing is conditional on owner-controlled `android/key.properties`; no signing secret belongs in source control.

## Automated checks implemented

`scripts/verify-android-play-readiness.mjs` verifies SDK levels, app identity, backup/cleartext settings and the native permission allowlist. The automated tests ensure a location permission or a target SDK downgrade is detected.

## Previously verified CI evidence

- Android CI builds and packages the API 36 debug pilot APK and unsigned release AAB.
- Android lint, unit-test and instrumentation compilation are part of CI.
- API 36 emulator executes instrumentation tests, installs the APK and cold-launches the application.
- Historical run 44152121586 and later run 44152670183 passed the emulator/build checks.

## Open gates — not yet passed

1. Physical device matrix P01–P24 in `docs/checkpoints/LMU-ANDROID-PHYSICAL-TEST-PLAN-20261117.md`.
2. Release signing with owner-controlled key material and independent signature verification.
3. Final AAB inspection using bundletool / Play Console internal testing.
4. Play Console target audience, Families, Data safety, ads, content rating and app access declarations.
5. Privacy policy and account/data deletion workflow review.
6. Reviewer access instructions for gated areas.
7. Play pre-launch report and crash/ANR review.
8. Confirm meaningful native/application functionality beyond a basic website WebView, especially for child audiences.

A passing static baseline is not a Play approval guarantee. No Play Store submission is being made.

## Additional policy review findings

- The repository already includes a public privacy policy (`privacy.html`) and a browser-accessible account/data deletion request page (`account-data-request.html`). Existing `tests/privacy-play-readiness.test.mjs` checks the policy, request mechanism, authenticated RPC usage, in-app links and privacy resource build inclusion. These are code-level checks; the Play Console Data safety and account deletion declarations still need owner completion and live-flow verification.
- The app serves children and older users, so the Families policy is in scope if any child age group is selected in Target Audience. The policy requires accurate target-audience, Data safety and content-rating answers and says a child-targeted app must not merely provide a website WebView.
- The current native Android entry point is a Capacitor BridgeActivity and most application functionality is web-delivered. The app has real learning workflows, role controls, offline/PWA behaviour and Milo features, but we have not yet established that Google Play will regard the mobile experience as sufficiently differentiated from a simple website WebView. Treat this as a HIGH review risk until a reviewer-oriented feature audit and, if needed, additional native functionality are verified.
- The RECORD_AUDIO declaration is optional-feature related and must be requested only at the point of use, with appropriate guardian/child controls and a graceful denial path. Static manifest checks do not prove runtime permission UX.

## Readiness classification

- Engineering source baseline: PASS (subject to current CI).
- Play policy preflight: PARTIAL.
- Physical-device quality: NOT TESTED.
- Signed Play upload artifact: NOT READY.
- Google Play approval: NOT PREDICTABLE from CI; only Google Play review can decide.

## Latest CI checkpoint

- Android workflow run `44237036250` completed its `verify-android` build job successfully, including the static Play baseline preflight and production bundle/APK packaging. The companion API 36 emulator job was queued at the time of this note.
- The existing LMU feature branch `production/lmu-blueprint-room-shell-20261117` previously passed full Android build and emulator verification in run `44152670183`. The compare against `main` shows no Android Gradle/manifest configuration changes on that feature branch; only an instrumentation test file differs.

- **AI data handling (HIGH):** LMU includes Milo and sends the minimum content needed for a request to a configured AI inference provider, as described in the public privacy policy. Google Play's 2026 policy clarifications explicitly apply User Data requirements to third-party AI integrations. Before submission, verify provider terms for child-directed use, limited-use restrictions, disclosures, guardian/age-appropriate consent, retention and Play Console Data safety answers. The privacy-policy text alone does not complete this gate.
