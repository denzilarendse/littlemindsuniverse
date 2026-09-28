# LittleMinds Connect — Google Play Data Safety Evidence Inventory

Date: 2026-09-28
Status: engineering evidence draft for Play Console completion. This document is not a substitute for the final Play Console questionnaire and must be reconciled with the exact Play-distributed build and enabled production services before submission.

## Scope

App: **LittleMinds Connect**  
Package: `za.co.littlemindsuniverse.connect`  
Release line: `1.0.0` / version code `1`

The standalone Android shell packages the LittleMinds Connect authenticated web experience. It uses the same LittleMindsUniverse Supabase-backed identity and relationship-authorized Connect service.

## Native Android evidence

The Connect Android manifest currently:

- requests `android.permission.INTERNET` only;
- sets `android:usesCleartextTraffic="false"`;
- disables Android backup with `android:allowBackup="false"` and `android:fullBackupContent="false"`;
- declares an HTTPS app-link surface for `www.littlemindsuniverse.co.za/connect...`;
- does not declare location, contacts, camera, microphone, SMS, phone, Bluetooth, advertising-ID, or storage/media permissions.

The JavaScript package manifest contains Capacitor runtime dependencies only and does not list an advertising or analytics SDK package.

These facts do **not** mean the app collects no data: authenticated account and classroom communication data are transmitted to the LittleMindsUniverse service over the network.

## Data categories supported by current runtime behavior

Use this table as the evidence starting point for the Play Console Data Safety form. Where the Play form wording differs, map the real data flow rather than copying labels mechanically.

| Play-style category | Current evidence | Collection / handling purpose | Sharing / processor notes | Console status |
| --- | --- | --- | --- | --- |
| Personal info — email address | Used for LittleMindsUniverse authentication/sign-in | Account authentication, password recovery, account security | Supabase provides authentication infrastructure | Declare based on Play definition: transmitted to service |
| Personal info — name / display name | Profiles and relationship-aware contact display can include display names | Identify authorized parent/teacher/learner relationships and message participants | Stored/processed in LittleMindsUniverse backend | Declare if Play form asks for name |
| User IDs | Supabase/auth profile UUIDs and relationship IDs identify authenticated users | Authentication, authorization, role isolation, message ownership, auditing | Supabase backend processing | Declare |
| Messages — in-app messages | Connect conversations/messages are a core feature | Relationship-authorized parent/teacher communication | Stored in Supabase-backed Connect service; visible only to authorized participants under RLS/server checks | Declare |
| App interactions / activity tied to messaging | Conversation membership, timestamps, read/delivery state and reply relationships are maintained | Deliver messaging, unread/read state, safety/audit behavior and service reliability | Backend processing | Review exact Play category wording and declare where applicable |
| Account-management/privacy requests | Verified account-removal/privacy-inquiry requests are stored in a restricted queue | Fulfill privacy and account/data requests, maintain request status | LittleMindsUniverse backend; direct browser table access is revoked | Declare only if Play questionnaire maps this to collected personal/user data |
| Learning/profile data reachable through the wider LittleMindsUniverse account | The shared account ecosystem may contain learner relationships and learning records, but Connect 1.0 does not present itself as the full learning app | Relationship authorization and navigation back to LittleMindsUniverse | Shared LittleMindsUniverse backend | Do not omit merely because the standalone screen is messaging-focused; validate what the exact Connect runtime actually requests/transmits |

## Data categories not evidenced by the current Connect 1.0 native/runtime review

No current evidence was found for Connect 1.0 collecting through native permissions or bundled SDKs:

- precise or approximate device location;
- device contacts/address book;
- call logs or SMS;
- microphone/audio recording;
- camera capture;
- health/fitness data;
- calendar data;
- local photos/videos through a declared Android media permission;
- advertising ID through an app-declared advertising permission/SDK;
- third-party advertising SDK data collection.

**Do not convert this section into a permanent “No” if a later feature, SDK, WebView capability, file picker, analytics product, crash reporter, payment flow, or messaging attachment feature changes the runtime. Re-audit the release candidate first.**

## Security and transport evidence

Current evidence supports the following statements for the release candidate:

- Android cleartext traffic is disabled.
- Production LittleMindsUniverse endpoints are HTTPS.
- Supabase privileged/service credentials are not bundled in browser/Android public assets.
- Connect data access is relationship/role authorized and protected by row-level/server checks.
- Android backup is disabled for the standalone Connect shell.
- Privacy-request table access is not granted directly to `anon` or `authenticated`; only narrow authenticated RPCs are executable.

Final Play Console answer for **data encrypted in transit** should remain **Yes only while all release data paths continue to use HTTPS/TLS or an equivalently encrypted transport**.

## Account and data removal

The LittleMindsUniverse ecosystem supports account creation in the main product. Connect itself is sign-in focused, but it links to the shared account ecosystem. Therefore the release track treats the Google Play account-deletion requirement as applicable.

Engineering implementation in draft PR #44 provides:

- in-app link to Privacy / Account & data requests;
- public browser resource: `https://www.littlemindsuniverse.co.za/account-data-request.html` after controlled deployment;
- public privacy policy: `https://www.littlemindsuniverse.co.za/privacy.html` after controlled deployment;
- authenticated `request_account_removal(text)` RPC;
- authenticated `submit_privacy_inquiry(text,text)` RPC;
- restricted `public.privacy_requests` queue.

The static URLs above must not be entered into Play Console until the controlled production deployment and independent HTTP checks confirm they are publicly reachable.

Account removal is request-first because the shared education database contains child-safety, verified relationship, payment/accounting and audit records with intentional retention/integrity constraints. The privacy policy states that removable data will be deleted or de-identified while limited records may be retained only for safeguarding, security/fraud prevention, accounting/transaction, dispute, or legal obligations.

## Service providers / possible Play “sharing” analysis

Known infrastructure used by the wider product can include:

- Supabase — authentication, database, storage/realtime infrastructure;
- website/application hosting and delivery infrastructure;
- configured AI inference providers for Milo when that separate feature is used;
- PayFast when payment features are used;
- Meta / WhatsApp Business when an authorized WhatsApp feature is enabled and used.

For Play Data Safety, **do not automatically classify every service provider as “shared data.”** Apply Google Play’s current definition and processor/service-provider exceptions to the exact data flow. Conversely, do not omit a transfer merely because the recipient is a vendor. The final answers must match the actual release configuration and contractual purpose.

For standalone Connect 1.0 specifically, focus first on the providers contacted by the packaged Connect runtime. Do not declare Milo, PayFast, or WhatsApp collection by Connect unless the exact Connect app actually invokes those flows in the released build.

## Children / Families review points

Because the wider LittleMindsUniverse audience includes children, Play Target Audience and Content / Families answers must be completed deliberately. Current Connect safety evidence includes:

- no random/anonymous chat path;
- no phone-number discovery requirement;
- learner direct-send is restricted in the current backend/client release;
- parent/teacher messaging is relationship-authorized;
- learner profiles are not designed as public social profiles.

These controls support the engineering evidence but do not replace the Play Families declaration or policy review.

## Play Console completion checklist

Before submitting Data Safety / App content:

- [ ] Deploy and verify `privacy.html` publicly.
- [ ] Deploy and verify `account-data-request.html` publicly.
- [ ] Re-run the release candidate dependency/permission/data-flow audit after the final AAB is selected.
- [ ] Confirm whether any attachments/file picker path is enabled in the exact Connect release and map resulting file data if so.
- [ ] Confirm the production Supabase/project endpoints and all enabled third-party services contacted by Connect.
- [ ] Complete each Data Safety category from actual runtime behavior rather than from marketing copy.
- [ ] Distinguish collection from Play-defined sharing using the current Google Play definitions.
- [ ] Confirm encryption-in-transit answer against every release network path.
- [ ] Confirm account/data removal URLs are active and match the privacy policy.
- [ ] Complete Target Audience and Content / Families answers.
- [ ] Complete IARC content rating.
- [ ] Save screenshots/exported evidence of the final Play declarations alongside the release record.

## Release rule

If a later Connect build adds analytics, advertising, crash telemetry, media attachments, device identifiers, location, contacts, camera/microphone capture, or any new third-party SDK/service, this inventory becomes stale and the Play Data Safety declaration must be reviewed before release.
