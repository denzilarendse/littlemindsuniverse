# LittleMinds Connect — Android / Google Play Release Track

Status: active release track; standalone package identity is owner-approved and frozen; unsigned API-36 release-candidate AAB is now built and independently inspected.

## Goal

Ship **LittleMinds Connect** as a standalone Android application on Google Play while preserving the existing LittleMindsUniverse web/PWA and Android product.

This is a separate release identity from the current LittleMindsUniverse Android app.

## Current verified state

- LittleMinds Connect web surface is live at `/connect.html` on `https://www.littlemindsuniverse.co.za`.
- Connect backend health is green on production.
- Existing LittleMindsUniverse Android package is `za.co.littlemindsuniverse`.
- Standalone Connect package identity has been explicitly approved by the owner.
- Standalone Connect Android release verification is green on implementation SHA `8753196509334249c9867405f896afed54871e32`.
- Release-verification run `36309904172`: PASS.
- Android-verification run `36309904104`: PASS.
- Vercel status for the same implementation SHA: PASS.

## Permanent identity — FROZEN

Standalone package:

`za.co.littlemindsuniverse.connect`

Play display name:

`LittleMinds Connect`

These identities are now frozen for this release track. Do not rename the package before or after Play publication without an explicit new-product migration decision.

## 2026 Play baseline

Google Play requires new phone/tablet apps and app updates submitted from 31 August 2026 to target Android 16 / API 36 or higher.

Official reference:

- https://support.google.com/googleplay/android-developer/answer/11926878

Because Connect is intended for users including children/families, the Play Families requirements, Target Audience and Content answers, Data safety declaration, privacy policy, account/data deletion flow, and content rating must accurately reflect the product.

Official Families reference:

- https://support.google.com/googleplay/android-developer/answer/9893335

The standalone app is an LMU-owned authenticated product shell backed by the same controlled Connect service, with native Android packaging, app identity, verified links, release signing and policy declarations.

## Implemented standalone architecture

The standalone Android app reuses the proven Connect web client and backend instead of forking messaging business logic.

Implemented shell:

1. dedicated Connect production web payload builder;
2. dedicated `capacitor.connect.config.json`;
3. dedicated Android `connectapp` application module;
4. frozen `za.co.littlemindsuniverse.connect` applicationId/namespace;
5. dedicated `LittleMinds Connect` app label;
6. API 36 target through the shared Android toolchain;
7. backup disabled and cleartext traffic disabled;
8. INTERNET is the only requested Android permission;
9. app links are scoped to `https://www.littlemindsuniverse.co.za/connect...`;
10. dedicated Connect launcher/splash mark;
11. owner-local optional signing via `android/connectapp/key.properties`;
12. CI builds LMU and Connect as separate unsigned AAB artifacts.

The native Connect payload copies only the Connect shell and its required public assets from the verified production build. A secret scan rejects server-secret assignment patterns before packaging.

## First standalone AAB evidence

Android-verification run `36309904104` completed successfully on implementation SHA:

`8753196509334249c9867405f896afed54871e32`

The run passed:

- locked dependency install;
- shipped-runtime dependency audit;
- full web regression/build suite;
- LMU Android sync;
- standalone Connect payload generation;
- frozen identity / SDK / child-safe native-default assertions;
- LMU and Connect Android lint;
- LMU and Connect release unit-test tasks;
- LMU and Connect app-scoped instrumentation compilation;
- both unsigned API-36 release bundle builds;
- unsigned-state verification;
- separate artifact uploads.

Standalone Connect artifact:

- artifact name: `littleminds-connect-android-api36-unsigned`
- artifact id: `10929040991`
- GitHub artifact ZIP digest: `sha256:00002d339448b8664c05840bc4fd542ec8a38c09a3513b7d214e871dbbd6c4cd`
- extracted `connectapp-release.aab` SHA-256: `fe3b0b2a29b898232b114188cb1cde2a9af3eaeb811ba1ed96ae5a259b127adc`

Independent inspection of that exact downloaded artifact confirmed:

- the AAB contains package identity text `za.co.littlemindsuniverse.connect` in its packaged Android manifest;
- packaged Capacitor config is `appId=za.co.littlemindsuniverse.connect`, `appName=LittleMinds Connect`;
- the packaged native web payload contains the Connect shell and dedicated Connect assets;
- the main LMU application root is not present in the Connect native entry page;
- no server-secret assignment patterns were found in the packaged public assets;
- `jarsigner -verify` reports `jar is unsigned`, as intentionally required before the owner-signing gate.

The API-36/min-SDK-24 configuration and child-safe native defaults were asserted by the same CI run before the exact AAB was built.

## Red -> repair -> green retained

The first dual-app Android run reached the new Connect native module and exposed a real compatibility error: the base theme used `android:windowLightNavigationBar`, an API-27 attribute, while Connect supports Android API 24+.

The repair did **not** raise the minimum SDK or add a lint baseline. The unnecessary API-27-only base-theme attribute was removed while preserving the navigation-bar background, and a regression test now prevents that attribute from returning to the API-24 base theme. Release verification and Android verification then returned green and produced the exact Connect AAB recorded above.

## Release gates

### Engineering

- [x] Freeze standalone Connect package identity.
- [x] Add dedicated Connect build target that packages the Connect shell only.
- [x] Add dedicated Capacitor configuration.
- [x] Add standalone Android application module.
- [x] Set API 36 target and supported minimum SDK through the shared Android toolchain.
- [x] Verify no cleartext traffic and no unnecessary permissions at source/CI gate.
- [x] Add dedicated launcher/splash mark.
- [x] Add regression tests preventing LMU/Connect package identity collisions.
- [x] Build unsigned Connect AAB in CI and record exact artifact evidence.
- [x] Inspect exact AAB identity and packaged web payload.

### Safety / policy

- [ ] Confirm child/family target-audience declaration.
- [x] Verify no random/anonymous chat path in current Connect client/backend regression suite.
- [x] Verify learner messaging restrictions remain enforced server-side in current regression suite.
- [ ] Complete Data safety inventory from actual runtime behavior.
- [ ] Confirm privacy-policy URL and account/data deletion path.
- [ ] Complete IARC content rating questionnaire accurately.
- [ ] Prepare store listing copy and screenshots without overstating accreditation or safety certification.

### Signing / links

- [ ] Generate owner-controlled **Connect-specific** upload key.
- [ ] Back up upload key in at least two owner-controlled locations.
- [ ] Build and verify signed Connect AAB.
- [ ] Enable Play App Signing.
- [ ] Record upload certificate SHA-256.
- [ ] Record Google Play app-signing certificate SHA-256.
- [ ] Generate Digital Asset Links for the standalone Connect package using the **Play app-signing certificate**.
- [ ] Publish and externally verify `/.well-known/assetlinks.json` with both approved package identities where required.

### Play release

- [ ] Create Play Console app with package `za.co.littlemindsuniverse.connect`.
- [ ] Upload signed AAB to internal testing.
- [ ] Install exact Play-distributed internal-track artifact on physical Android device.
- [ ] Verify sign-in, session persistence, Connect contacts, send/reply/read flow, role isolation, realtime, offline/reconnect behavior and app links.
- [ ] Review Play pre-launch report.
- [ ] Resolve all release-blocking issues with regression evidence.
- [ ] Complete Families / Target Audience / Data safety / content rating / privacy / deletion declarations.
- [ ] Move to closed testing when internal gate is green.
- [ ] Submit production release only after owner approval and all release evidence is green.

## Signing model

Use Google Play App Signing. The owner keeps the Connect upload key; Google Play holds the production app-signing key. Digital Asset Links must use the Play **app-signing** SHA-256 fingerprint for the Play-distributed Connect app, not merely the local upload-key fingerprint.

Official reference:

- https://support.google.com/googleplay/android-developer/answer/9842756

The existing LittleMindsUniverse upload key, if/when created, must not automatically be reused for Connect. Treat the two packages as separate signing assets unless the owner deliberately chooses otherwise before key creation.

## Non-negotiable safety boundaries

- No open/random child messaging.
- No phone-number discovery requirement.
- No public learner profiles by default.
- Learner direct-send remains disabled unless a separately governed policy explicitly enables a bounded use case.
- Teacher/guardian communication remains relationship-authorized.
- No server secrets in the Android bundle.
- No signing keys or passwords in Git/source control.
- Do not weaken RLS or backend authorization to make mobile tests pass.

## Immediate next gate

The independent engineering layer has reached a green unsigned Connect API-36 AAB. The next hard gate is owner-controlled Connect upload-key creation, followed by a signed exact candidate and Google Play Console internal-track setup. The Play app-signing certificate SHA-256 obtained after Play App Signing will then be used for Digital Asset Links.
