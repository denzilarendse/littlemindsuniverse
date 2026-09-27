# LittleMinds Connect — Android / Google Play Release Track

Status: active release track, package identity not yet frozen.

## Goal

Ship **LittleMinds Connect** as a standalone Android application on Google Play while preserving the existing LittleMindsUniverse web/PWA and Android product.

This is a separate release identity from the current LittleMindsUniverse Android app.

## Current verified state

- LittleMinds Connect web surface is live at `/connect.html` on `https://www.littlemindsuniverse.co.za`.
- Connect backend health is green on production.
- Existing LittleMindsUniverse Android package is `za.co.littlemindsuniverse`.
- Existing LittleMindsUniverse Android CI targets API 36 and produces an unsigned AAB.
- Existing owner-signing guidance is prepared for the LMU package, but no standalone Connect Android package exists yet.

## Permanent identity decision

Proposed standalone package:

`za.co.littlemindsuniverse.connect`

Proposed Play display name:

`LittleMinds Connect`

**Do not freeze or publish this package name until the owner explicitly approves it.** Google Play package identity is effectively permanent once published.

## 2026 Play baseline

Google Play requires new phone/tablet apps and app updates submitted from 31 August 2026 to target Android 16 / API 36 or higher.

Official reference:

- https://support.google.com/googleplay/android-developer/answer/11926878

Because Connect is intended for users including children/families, the Play Families requirements, Target Audience and Content answers, Data safety declaration, privacy policy, account/data deletion flow, and content rating must accurately reflect the product.

Official Families reference:

- https://support.google.com/googleplay/android-developer/answer/9893335

The standalone app must not be merely a thin unaffiliated WebView. It is an LMU-owned authenticated product shell backed by the same controlled Connect service, with native Android packaging, app identity, verified links, release signing and policy declarations.

## Architecture target

The standalone Android app should reuse the proven Connect web client and backend rather than fork messaging business logic.

Planned shell:

1. dedicated Connect production web bundle entry;
2. dedicated Capacitor configuration;
3. dedicated Android application namespace/applicationId;
4. dedicated app name, icon/splash and store assets;
5. API 36 target;
6. no cleartext traffic;
7. minimum required permissions only;
8. production HTTPS origin and verified app links;
9. same Supabase/Auth/Connect authorization model;
10. same learner safety restrictions and verified relationship graph.

## Release gates

### Engineering

- [ ] Freeze standalone Connect package identity.
- [ ] Add dedicated Connect build target that packages the Connect shell only.
- [ ] Add dedicated Capacitor configuration.
- [ ] Add standalone Android project or deterministic generated Android target.
- [ ] Set API 36 target and supported minimum SDK.
- [ ] Verify no cleartext traffic and no unnecessary permissions.
- [ ] Add branded launcher/adaptive icon and splash assets.
- [ ] Add regression tests preventing LMU/Connect package identity collisions.
- [ ] Build unsigned Connect AAB in CI.
- [ ] Inspect exact AAB identity and packaged web payload.

### Safety / policy

- [ ] Confirm child/family target-audience declaration.
- [ ] Verify no random/anonymous chat path for child users.
- [ ] Verify learner messaging restrictions remain enforced server-side.
- [ ] Complete Data safety inventory from actual runtime behavior.
- [ ] Confirm privacy-policy URL and account/data deletion path.
- [ ] Complete IARC content rating questionnaire accurately.
- [ ] Prepare store listing copy and screenshots without overstating accreditation or safety certification.

### Signing / links

- [ ] Generate owner-controlled Connect upload key.
- [ ] Back up upload key in at least two owner-controlled locations.
- [ ] Build and verify signed Connect AAB.
- [ ] Enable Play App Signing.
- [ ] Record upload certificate SHA-256.
- [ ] Record Google Play app-signing certificate SHA-256.
- [ ] Generate Digital Asset Links for the standalone Connect package using the **Play app-signing certificate**.
- [ ] Publish and externally verify `/.well-known/assetlinks.json`.

### Play release

- [ ] Create Play Console app with frozen package identity.
- [ ] Upload signed AAB to internal testing.
- [ ] Install exact Play-distributed internal-track artifact on physical Android device.
- [ ] Verify sign-in, session persistence, Connect contacts, send/reply/read flow, role isolation, realtime, offline/reconnect behavior and app links.
- [ ] Review Play pre-launch report.
- [ ] Resolve all release-blocking issues with regression evidence.
- [ ] Complete Families / Target Audience / Data safety / content rating / privacy / deletion declarations.
- [ ] Move to closed testing when internal gate is green.
- [ ] Submit production release only after owner approval and all release evidence is green.

## Signing model

Use Google Play App Signing. The owner keeps the upload key; Google Play holds the production app-signing key. Digital Asset Links must use the Play **app-signing** SHA-256 fingerprint for the Play-distributed app, not merely the local upload-key fingerprint.

Official reference:

- https://support.google.com/googleplay/android-developer/answer/9842756

## Non-negotiable safety boundaries

- No open/random child messaging.
- No phone-number discovery requirement.
- No public learner profiles by default.
- Learner direct-send remains disabled unless a separately governed policy explicitly enables a bounded use case.
- Teacher/guardian communication remains relationship-authorized.
- No server secrets in the Android bundle.
- No signing keys or passwords in Git/source control.
- Do not weaken RLS or backend authorization to make mobile tests pass.

## Immediate next engineering step after owner identity approval

Freeze `LittleMinds Connect` + the standalone package ID, then implement the dedicated Connect Android build target and API-36 CI gate before generating any owner signing material.
