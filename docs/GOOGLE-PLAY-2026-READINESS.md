# Google Play 2026 readiness — LittleMindsUniverse

Updated: 3 October 2026.

## Product facts

- LMU serves ages 2–18 and therefore includes children in its target audience.
- Canonical communication is LittleMinds Connect. There is no random/anonymous chat path.
- LMU Android targets API 36.
- LMU requests INTERNET and consent-gated RECORD_AUDIO only.
- Connect Android requests INTERNET only.
- The source manifests must not request AD_ID, location, contacts, phone-number, SMS or call-log permissions.
- Account creation requires a public privacy policy plus in-app and external account-deletion paths.
- Milo may use a configured third-party AI inference provider; LMU remains responsible for applicable user-data disclosures and consent.

## Current Google Play requirements applied to LMU

1. **Families / child audience** — accurately complete Target Audience and Content, Data safety and IARC content rating. Child-accessible content must be appropriate. Sensitive child data such as authentication and microphone data must be disclosed.
2. **Messaging** — anonymous/random chat must not target children. LMU uses relationship-authorized Connect only.
3. **Data minimisation** — child-only paths must not transmit restricted device identifiers. LMU source CI rejects AD_ID, location, contacts, phone, SMS and call-log permissions.
4. **Account deletion** — account-creating apps need an in-app deletion path and an external web deletion resource.
5. **Target API** — Play requires current target API compliance; LMU is frozen at target/compile API 36.
6. **Closed testing** — if the Play developer account is a personal account created after 13 November 2023, production access requires at least 12 opted-in closed testers continuously for 14 days before application for production access.

## Required Play Console evidence

- [ ] Confirm developer-account type and whether the 12-testers/14-days rule applies.
- [ ] Create/confirm the Play app entry and exact package identity.
- [ ] Enable Google Play App Signing.
- [ ] Upload the owner-signed AAB to Internal testing.
- [ ] Record Play app-signing certificate SHA-256.
- [ ] Publish Digital Asset Links using the Play app-signing certificate.
- [ ] Complete Target Audience and Content.
- [ ] Complete Families declarations.
- [ ] Complete Data safety from actual runtime behavior.
- [ ] Complete IARC content rating.
- [ ] Enter the production privacy-policy URL.
- [ ] Enter the public account-deletion URL.
- [ ] Review the Play pre-launch report.
- [ ] Move to Closed testing only after internal-track evidence is green.
- [ ] Apply for production access only when any account-specific testing requirement is satisfied.

## Primary sources

- https://support.google.com/googleplay/android-developer/answer/9893335
- https://support.google.com/googleplay/android-developer/answer/11043825
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/16561298
- https://support.google.com/googleplay/android-developer/answer/17134731
