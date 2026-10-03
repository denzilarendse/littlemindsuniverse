# Google Play Data Safety inventory — 3 October 2026

This is an engineering inventory for Play Console completion. It is not a substitute for reviewing the final Play definitions and every production provider/SDK before submission.

## Product surfaces

- LittleMindsUniverse Android: `za.co.littlemindsuniverse`
- LittleMinds Connect Android: `za.co.littlemindsuniverse.connect`
- Shared backend: Supabase Auth/Postgres/Storage/Realtime plus LMU server APIs
- Milo: configured server-side AI inference provider

## Data LMU intentionally transmits or stores

### Account and identity
- email address;
- display name;
- verified account role;
- preferred language;
- internal user/profile identifiers.

Purpose: authentication, account management, role authorization, service operation and security.

### Managed learner / education
- learner display name;
- age-stage/curriculum/country settings;
- classroom relationships;
- assigned work and responses;
- teacher reviews;
- evidence-based mastery/progress records;
- teacher-approved reports.

Purpose: core educational functionality and relationship authorization.

### LittleMinds Connect
- authorized conversation/member identifiers;
- message body;
- reply relationship;
- timestamps;
- delivered/read state;
- idempotency identifier.

Purpose: private family-school messaging and service reliability.

No random/anonymous chat or phone-number discovery is part of the canonical Connect model.

### Optional evidence / microphone
LMU Android declares RECORD_AUDIO because voice evidence can be captured. Recording is feature-gated, guardian/feature-consent governed where required, and still requires a separate Android permission grant.

Possible transmitted data when the user deliberately uses the feature:
- audio evidence;
- duration/type metadata;
- optional transcript text;
- related learning-item/learner identifiers.

Purpose: educational evidence, teacher review and permitted learning assistance.

### Milo AI requests
The minimum content/context needed for an educational request may be transmitted server-side to the configured AI inference provider. Server secrets are not shipped to Android/browser clients.

Purpose: educational assistance.

## Data LMU source does not intentionally request through Android permissions

CI rejects the following from both Android app manifests unless a separately reviewed product change is made:
- precise or approximate location;
- contacts;
- phone state/phone number;
- SMS;
- call logs;
- advertising ID.

Connect Android requests INTERNET only.
LMU Android requests INTERNET and RECORD_AUDIO only.

## SDK / ads position

The current package manifest does not contain an advertising SDK dependency and the source does not declare AD_ID. Before Play submission, inspect the exact signed AAB dependency/merged-manifest output again because transitive SDK behavior can change.

## Security / retention

- public database tables are RLS-protected;
- direct sensitive table access is restricted;
- browser-callable privileged RPCs are relationship/role authorized;
- evidence retention is automated through a protected retention worker;
- public account-deletion and privacy-request mechanisms are part of the release candidate.

## Play Console completion checklist

For every data type in the final signed build determine:
1. whether it leaves the device;
2. whether it is ephemeral or retained;
3. whether it is required or optional;
4. purpose(s);
5. encryption in transit;
6. deletion path;
7. whether Play's definition treats any third-party disclosure as sharing.

Re-run this inventory against the exact signed AAB before submitting Data Safety.
