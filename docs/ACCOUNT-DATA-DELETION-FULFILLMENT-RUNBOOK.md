# LittleMindsUniverse — Account & Data Deletion Fulfillment Runbook

Status: release-control procedure  
Applies to: LittleMindsUniverse and LittleMinds Connect  
Last updated: 2026-09-28

## Purpose

This runbook turns a verified `privacy_requests` account-deletion request into a controlled fulfillment process. It exists because LittleMindsUniverse is a shared education system: one adult account can be linked to learners, other guardians, teachers, schools, safety/consent evidence, payments and classroom records. A blind `auth.users` delete is therefore not an acceptable deletion procedure.

The goal is to delete or de-identify data that belongs to the requesting account while preserving only records that must remain for another authorized person, child safeguarding, security/fraud prevention, transaction/accounting, dispute handling or another legal obligation. Any retained information must remain restricted to that retention purpose.

## Security boundary

- Never process a deletion request from an unauthenticated email, screenshot or chat message alone.
- The public client may only create a verified request through the authenticated RPC.
- `public.privacy_requests` remains inaccessible directly to `anon` and `authenticated` browser roles.
- Fulfillment is an administrator/server-side operation only.
- Never place a Supabase service-role/secret key in the website, Android bundle, Git, CI artifacts, screenshots or support messages.
- Do not weaken RLS or foreign keys to make deletion appear successful.
- Do not delete shared learner/school records merely because one linked adult requested deletion.

## Queue states

`pending` → request recorded and awaiting review.  
`processing` → an authorized operator has started the dependency/retention review.  
`completed` → deletable data has been deleted/de-identified, the auth account has been removed where applicable, and retained-data rationale has been recorded.  
`declined` → use only when the request cannot lawfully or technically be fulfilled for the identified account; record a concise reason and provide the user a route to resolve the issue. Do not use `declined` merely because some limited data must be retained.

## 1. Find the request — administrator only

Use an authenticated administrator/server-side database view or Supabase administrative tooling. Do not expose this query through the public client.

```sql
select
  r.id,
  r.profile_id,
  r.request_type,
  r.source,
  r.status,
  r.created_at,
  r.updated_at
from public.privacy_requests r
where r.request_type = 'account_removal'
  and r.status in ('pending','processing')
order by r.created_at asc;
```

Process the oldest verified requests first unless a safeguarding/security issue requires a different order.

## 2. Lock the request for processing

After an authorized operator accepts the case, change only that request to `processing`. Use administrator/server-side access and record the processing timestamp through `updated_at`.

Do not copy the user's message content, email address or learner names into `resolution_note`. The resolution note should contain only the minimum retention/fulfillment rationale needed for audit.

## 3. Verify identity and account linkage

Confirm:

- the request `profile_id` maps to the expected authenticated profile;
- the request is still active and has not already been completed;
- the account's current role(s);
- guardian/learner relationships;
- teacher/organization/classroom relationships;
- Connect conversation membership and authored messages;
- learning/submission/report ownership;
- payment/entitlement/transaction relationships;
- consent/safety/audit relationships;
- storage objects or evidence files owned solely by the account.

If the account is a guardian of a learner, determine whether another verified guardian or school relationship remains. Deleting the adult account must not orphan a child record or remove records another authorized party is entitled or required to retain.

## 4. Classify data before changing it

For each related record, assign one outcome:

### Delete
Use when the record belongs solely to the requesting account and no disclosed retention reason applies. Examples may include account-only preferences, unshared profile metadata and account-owned transient records.

### De-identify
Use when the relational/service record must remain but the requesting user's identifying fields are not required. Replace direct identifiers with a neutral tombstone/reference where the schema and product behavior allow it. Never fabricate another real person's identity.

### Retain — shared relationship
Use when removing the record would erase another guardian's, learner's, teacher's or school's valid record. Restrict the requesting user's identifying information to the minimum needed.

### Retain — safeguarding/security/legal/accounting
Use only for the limited purposes described in the public Privacy Policy. Record the category, not unnecessary personal details, in the administrative case note.

## 5. Check external processors used by the exact account

Only process services that actually received the account's data. Depending on enabled features this may include Supabase infrastructure and, where the user invoked those features, payment, WhatsApp Business or AI-processing providers.

Do not send a deletion request to a provider that never received that user's data. Conversely, do not treat deletion from the primary database as complete if an enabled processor still holds deletable account data that must be removed under its processor controls.

## 6. Delete/de-identify application data

Perform the dependency cleanup in a transaction where practical, but do not attempt to delete the Supabase Auth user inside an ordinary SQL transaction.

Rules:

1. delete account-owned records that are safe to delete;
2. de-identify shared records where possible;
3. preserve only the minimum fields required for legitimate retention;
4. remove private storage objects owned solely by the account when no retention rule applies;
5. verify that no RLS policy or relationship now grants access to the removed account;
6. verify that learner/guardian/teacher/school relationships for other users remain intact.

If a foreign-key `RESTRICT` or `NO ACTION` boundary blocks a change, stop and classify the dependency. Do not drop or weaken the constraint as a shortcut.

## 7. Remove the authentication account — server/admin API only

After application-data dependency cleanup is complete, remove the Supabase Auth user with the Supabase administrative Auth API from a trusted server/operator environment. Do not expose `auth.admin` in public browser code.

Before invoking the admin deletion, confirm:

- the target UUID exactly equals the request `profile_id`/auth user being processed;
- no unresolved shared-data dependency would be damaged by the profile/auth cascade;
- required retained records no longer depend on the live profile identity, or are otherwise safely retained under the designed schema;
- a second operator/check or equivalent owner verification has confirmed the target for production deletion.

The final delete is intentionally not automated from the public request page.

## 8. Post-delete verification

Verify all of the following before closing the request:

- sign-in for the removed account no longer succeeds;
- its normal authenticated session/token can no longer be used after normal revocation/expiry handling;
- direct profile data intended for deletion is gone;
- private files intended for deletion are gone;
- other guardians/learners/teachers/schools still see only their authorized data;
- retained records contain only the minimum justified information;
- Connect relationships/messages are no longer exposed to the removed account;
- no server-secret or admin credential was written to logs/evidence.

## 9. Close the case

Update the privacy request through administrator/server-side access:

- `status = 'completed'`;
- `resolved_at = now()`;
- `updated_at = now()`;
- `resolution_note` = short non-sensitive outcome such as `deleted; shared education records de-identified; accounting retention applies`.

Do not store passwords, authentication tokens, payment-card data, learner-sensitive narrative or full copies of the deleted data in the case note.

If the auth account is already gone and the request row cascades away because of future schema changes, preserve a separate minimal non-identifying operational audit according to the approved retention design before relying on that behavior. Do not change the current schema casually to achieve this.

## 10. User communication

Where the service has a verified contact route, confirm completion without disclosing protected learner/classroom information. If limited information was retained, describe the retention category and purpose at a high level consistent with the Privacy Policy.

## Production acceptance tests

A deletion implementation is not release-complete merely because the request form works. Before declaring full deletion operations green, verify at least one dedicated non-production/test account end to end:

- [ ] create a test account and representative relationships;
- [ ] submit a deletion request through the public/in-app flow;
- [ ] confirm only that account can create its request;
- [ ] confirm browser roles cannot read the queue directly;
- [ ] process the request under administrator controls;
- [ ] delete/de-identify the test account's deletable records;
- [ ] remove the test Auth user through the admin API;
- [ ] confirm sign-in is blocked;
- [ ] confirm other linked test users retain correct access/data;
- [ ] confirm retained safety/accounting data is minimal and inaccessible outside authorized roles;
- [ ] mark the request/case completed and retain only minimal evidence.

## Release rule

Google Play policy URLs can be deployed once the request mechanism and queue are green, but **full operational account-deletion readiness must remain a release gate until this fulfillment process is exercised on a dedicated test account and its evidence is recorded**.
