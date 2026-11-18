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
