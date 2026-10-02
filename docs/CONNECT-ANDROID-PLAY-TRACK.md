# LittleMinds Connect — Android / Google Play Release Track

Status: active release track. Package identity is frozen; API-36 Android engineering is green; the owner-controlled Connect upload key exists; the exact Connect AAB has been signed and verified; the website APK distribution gate is independently verified. Google Play App Signing, Play-internal distribution, physical-device validation, and Play policy declarations remain external release gates.

Last reconciled: 2026-09-28.

## Product identity — FROZEN

- Play display name: `LittleMinds Connect`
- Android package: `za.co.littlemindsuniverse.connect`
- Version: `1.0.0`
- Version code: `1`
- Existing LittleMindsUniverse package remains separate: `za.co.littlemindsuniverse`

Do not rename the Connect package after Play publication without an explicit product-migration decision.

## Verified engineering state

The standalone Android application reuses the controlled LittleMinds Connect web/backend experience instead of forking messaging business logic.

Verified architecture and CI boundaries include:

1. dedicated Connect production payload builder;
2. dedicated Capacitor configuration;
3. dedicated `connectapp` Android application module;
4. frozen `za.co.littlemindsuniverse.connect` application ID / namespace;
5. API 36 compile/target configuration with min SDK 24;
6. backup disabled and cleartext traffic disabled;
7. INTERNET as the only requested Android permission;
8. Connect app-links scoped to the LittleMindsUniverse production origin;
9. dedicated Connect launcher/splash identity;
10. server-secret scanning before Android packaging;
11. separate unsigned AAB artifacts produced by CI;
12. child-safety and package-collision regression checks.

The public website download gate is independently green for the signed `LittleMinds-Connect-1.0.0.apk`:

- live payload size: `3,024,688` bytes;
- live APK SHA-256: `65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb`;
- APK Signature Scheme v2: verified;
- APK Signature Scheme v3: verified;
- one RSA-4096 signer;
- live APK signer certificate matches the recorded Connect upload certificate.

## Owner signing evidence — VERIFIED

The Connect-specific upload key was created in owner-controlled local storage and was not committed to source control.

Upload certificate:

- subject: `CN=LittleMinds Connect Upload, O=LittleMindsUniverse, C=ZA`
- SHA-256: `E9:BB:1E:07:82:AA:8B:19:55:0E:74:2F:E2:F5:9C:49:A0:34:5A:FD:D6:54:47:CE:23:73:4C:64:34:45:25:D5`
- RSA key size: 4096 bits

Signed Connect AAB SHA-256:

`e4462f1061e74c1132b0baf5461a20c0ee233317d01f21d55ee3e0e89f4c6fd0`

The signed AAB was locally verified with `jarsigner` and `keytool`. See `CONNECT-ANDROID-SIGNING-EVIDENCE-20260927.md` for the full evidence record.

**Important:** the upload certificate above is not automatically the Google Play app-signing certificate. Google Play App Signing must be enabled/confirmed in Play Console and the Google-held app-signing SHA-256 fingerprint must be recorded separately.

## 2026 Play baseline

As of this release track, Google Play requires new phone/tablet apps and updates submitted from 31 August 2026 to target Android 16 / API 36 or higher. Connect is configured to that baseline.

Because LittleMindsUniverse is an education platform whose target audience includes children and teenagers, Play Target Audience and Content / Families, Data safety, privacy policy, account/data deletion, content rating, and store-listing declarations must accurately reflect the real product behavior.

Official references:

- Target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Families requirements: https://support.google.com/googleplay/android-developer/answer/9893335
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756

## Privacy and account/data request work

A Play-readiness implementation is isolated in draft PR #44 (`release/connect-play-readiness`). It adds:

- public `privacy.html`;
- public `account-data-request.html`, usable in a standard browser without the Android app installed;
- in-app privacy/account links from LittleMindsUniverse and LittleMinds Connect;
- authenticated account-removal and privacy-inquiry request RPCs;
- a locked `public.privacy_requests` queue with RLS and no direct browser-role table access;
- regression tests preventing service-role/admin capabilities from reaching the browser.

Supabase migration version `20260928203851` is already applied to the live database. The static policy/request pages are **not declared live until the controlled production deployment and post-deploy URL checks are complete**.

Account removal is intentionally request-first rather than an unsafe direct `auth.users` deletion. Existing child-safety, consent, classroom, payment, and audit relationships include foreign-key retention boundaries that require controlled fulfillment. The public policy discloses that deletable data is removed or de-identified and that limited records may be retained only for safeguarding, security/fraud prevention, accounting/transaction, dispute, or legal obligations.

## Release gates

### Engineering

- [x] Freeze standalone Connect package identity.
- [x] Add dedicated Connect build target and Capacitor configuration.
- [x] Add standalone Android application module.
- [x] Target API 36 with supported min SDK 24.
- [x] Verify no cleartext traffic and no unnecessary native permissions.
- [x] Add launcher/splash identity and package-collision regression tests.
- [x] Build and inspect unsigned Connect AAB in CI.
- [x] Keep signing keys/passwords out of Git and CI artifacts.
- [x] Independently verify the live website APK bytes, checksum, headers, and signer.

### Safety / policy engineering

- [x] Verify no random/anonymous chat path in current Connect client/backend tests.
- [x] Verify learner messaging restrictions remain server-enforced.
- [x] Implement a public privacy policy resource in the Play-readiness branch.
- [x] Implement an in-app and public browser account/data request mechanism.
- [x] Add authenticated privacy-request queue/RPCs with RLS-locked direct table access.
- [x] Prepare a code/schema-grounded Data Safety evidence inventory.
- [ ] Deploy and externally verify the privacy-policy URL.
- [ ] Deploy and externally verify the account/data-request URL.
- [ ] Confirm final Target Audience and Content / Families answers in Play Console.
- [ ] Complete IARC content-rating questionnaire accurately in Play Console.
- [ ] Finalize store listing copy and screenshots without overstating accreditation or safety certification.

### Signing / links

- [x] Generate owner-controlled **Connect-specific** upload key.
- [ ] Back up the upload keystore in at least two owner-controlled secure locations.
- [x] Build and verify the exact signed Connect AAB.
- [x] Record upload certificate SHA-256.
- [ ] Create/confirm Connect in Play Console and enable Play App Signing.
- [ ] Record Google Play **app-signing** certificate SHA-256.
- [ ] Generate Digital Asset Links for `za.co.littlemindsuniverse.connect` using the Play app-signing certificate.
- [ ] Publish and externally verify `/.well-known/assetlinks.json`.

### Play release

- [ ] Create Play Console app with package `za.co.littlemindsuniverse.connect`.
- [ ] Upload the signed AAB to Internal testing.
- [ ] Install the exact Play-distributed internal-track artifact on a physical Android device.
- [ ] Verify sign-in, session persistence, Connect contacts, send/reply/read flow, role isolation, realtime, offline/reconnect behavior, privacy/account links, and app links.
- [ ] Review Play pre-launch report.
- [ ] Resolve release-blocking issues with regression evidence.
- [ ] Complete Families / Target Audience / Data Safety / content rating / privacy / account-removal declarations.
- [ ] Move to closed testing only when internal testing is green.
- [ ] Submit production release only after owner approval and all required evidence is green.

## Digital Asset Links rule

Use Google Play App Signing. The owner retains the Connect upload key; Google Play holds the production app-signing key for Play-distributed installs. Digital Asset Links for the Play-distributed Connect app must use the Google Play **app-signing** SHA-256 fingerprint, not merely the local upload-certificate fingerprint.

Until that Play fingerprint is obtained, `/.well-known/assetlinks.json` must not be published as though the upload certificate were the final Play certificate.

## Non-negotiable safety boundaries

- No open/random child messaging.
- No phone-number discovery requirement.
- No public learner profiles by default.
- Learner direct-send remains disabled unless a separately governed policy explicitly enables a bounded use case.
- Teacher/guardian communication remains relationship-authorized.
- No server secrets in browser or Android bundles.
- No signing keys or signing passwords in Git, CI artifacts, chat, screenshots, or public storage.
- Do not weaken RLS, foreign-key integrity, or backend authorization to make a release test pass.

## Immediate next gates

1. finish CI on draft PR #44 and keep it isolated from production until green;
2. perform a controlled Netlify deploy that preserves the owner-injected signed APK in `dist/downloads/`;
3. externally verify the privacy and account/data request URLs and re-verify the live APK checksum after deployment;
4. back up the Connect upload keystore in two owner-controlled secure locations;
5. create/confirm the Connect Play Console app, enable Play App Signing, and upload the verified signed AAB to Internal testing;
6. record the Google Play app-signing certificate fingerprint and only then publish Digital Asset Links;
7. install the Play-distributed build on a physical Android device and run the release E2E matrix and Play pre-launch report.
