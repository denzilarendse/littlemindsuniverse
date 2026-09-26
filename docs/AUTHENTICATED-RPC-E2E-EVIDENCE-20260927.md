# LittleMindsUniverse Authenticated RPC E2E Evidence — 27 September 2026

## Scope

This record covers live authenticated-role verification against the production Supabase project using real production relationship data and the same authorization-aware RPC surface used by LMU. Test writes were executed inside database transactions and rolled back.

This is **not** a claim of full browser credential E2E. Passwords were not read, reset or exposed, and no admin test account currently exists in the observed production profile set. Browser login/recovery/logout/mobile-session verification therefore remains a separate gate.

## Starting live relationship state

The live project contained confirmed learner, parent and teacher identities with active classroom membership and verified guardian relationships. The checked learner had an authenticated login identity, an active classroom relationship and a verified guardian relationship.

Read-path evidence before mutation testing:

- learner progress RPC returned an authorized learner row;
- learner published-work RPC returned assigned/published work;
- learner commercial-access RPC returned an access result;
- parent progress RPC returned the linked learner only;
- parent published-work, evidence-permission and notification-preference RPCs returned linked data;
- teacher classroom roster, submissions, mastery, Milo recommendations and available-skills RPCs returned classroom-scoped data.

Negative authorization evidence:

- learner calling the teacher classroom roster RPC was rejected with `Teacher access required.`;
- parent calling the teacher classroom roster RPC was rejected with `Teacher access required.`;
- teacher calling the guardian progress RPC returned zero guardian rows.

## LittleMinds Connect authenticated relationship checks

Using rollback-only live transactions:

- the verified teacher could create/open the classroom Connect conversation and send a message;
- the verified guardian could create/open the same relationship-authorized conversation and send a message;
- the learner was rejected from creating the classroom conversation because unrestricted learner classroom messaging is intentionally disabled;
- after rollback, the production Connect conversation/message tables retained zero test artifacts.

## Red: first learner submission failed

The first full teacher -> learner -> teacher production RPC vertical slice uncovered a real defect.

The sequence reached a newly published teacher assignment, but the learner's first `save_learner_work(...)` call failed with a NOT NULL violation on `learner_submissions.evidence_json`.

### Root cause

`save_learner_work` declared safe defaults:

- `v_help smallint := 0`
- `v_evidence_json jsonb := '{}'::jsonb`

It then performed an optional `SELECT ... INTO` for an existing submission. In PL/pgSQL, when that query finds no row, the target variables are assigned NULL. That cleared both declaration defaults on the first-submission path. The following INSERT therefore attempted to write a NULL `evidence_json` value into a NOT NULL column.

This was a genuine application defect, not a test expectation problem.

## Repair

PR #35, `Fix first learner submission null defaults`, added:

- migration `database/migrations/20260927_fix_learner_submission_null_defaults.sql`;
- regression test `tests/learner-submission-defaults.test.mjs`.

The repair is deliberately narrow. Immediately after the optional existing-submission lookup it restores the intended safe values with:

```sql
v_help := coalesce(v_help, 0);
v_evidence_json := coalesce(v_evidence_json, '{}'::jsonb);
```

The migration preserves the existing learner/verified-guardian authorization checks, commercial-access check, published-assignment requirement, duplicate-submission protection and non-empty/evidence submission rule.

## Source verification before live application

PR head SHA: `f3848856b402d2b0233660ff7289063c61b8da3e`.

Before merge:

- release-verification run `36279094076`: PASS;
- Android-verification run `36279094052`: PASS, including Android lint/unit/instrumentation compile and unsigned API-36 AAB build;
- Vercel status: PASS.

PR #35 was then merged as main SHA:

`1867f7b56a997c748608ce153757d0dadf916012`

Post-merge verification:

- release-verification run `36279210579`: PASS;
- Android-verification run `36279210567`: PASS, including unsigned API-36 release bundle upload;
- Vercel status for the merge SHA: PASS.

Only after those gates passed was the migration applied to the live Supabase project.

## Green: live production retest

The exact production relationship path was rerun after the migration inside one rollback-only authenticated transaction:

1. teacher created and published a homework learning item for an active classroom learner;
2. teacher associated a valid classroom curriculum skill;
3. learner opened the assigned item through `get_assigned_learning_item`;
4. learner submitted a non-empty independent response through `save_learner_work`;
5. teacher reviewed the submission through `review_learner_submission`;
6. teacher read the reviewed submission through `get_teacher_classroom_submissions`;
7. teacher read the learner/skill mastery state through `get_teacher_classroom_mastery`;
8. transaction rolled back.

Observed result:

- learner assignment rows: `1`;
- learner submission created: `true`;
- teacher review created: `true`;
- teacher could read the reviewed submission: `true`;
- mastery for the tested learner/skill was visible: `true`.

Post-rollback verification found zero `LMU rollback E2E` learning items and zero Connect test messages/conversations, confirming that this verification did not leave test content in production.

The learner and parent teacher-roster denial checks were rerun after the repair and still returned `Teacher access required.`. Teacher guardian-progress visibility remained zero.

## Advisor review after the DDL change

Supabase security and performance advisors were rerun after the live migration.

Security findings still requiring explicit review/owner configuration:

- `pg_net` remains installed in the public schema. Previous catalog inspection established that the managed installed extension is not relocatable, so it is not being blindly moved/dropped merely to silence the warning. Supabase reference: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- the advisor reports authenticated-callable `SECURITY DEFINER` RPCs. Many are intentional top-level authorization-aware APIs and must continue to be reviewed function-by-function rather than mass-converted/revoked. Supabase reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- leaked-password protection remains disabled and is still an Auth configuration hardening gate. Supabase reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Performance advisor output contains unused-index informational notices and four multiple-permissive-policy performance warnings. No missing-foreign-key-index regression was reported. No security predicate or required relationship rule was weakened to remove a performance warning.

## Gate transition

The production database/RPC vertical slice is now **PASS** for the exercised learner/parent/teacher authorization and teacher -> learner -> submission -> review -> mastery path, including LittleMinds Connect relationship authorization.

The following remain open and must not be conflated with this RPC-level pass:

- real browser credential login/logout/recovery/session lifecycle;
- admin role E2E (no observed admin test profile exists);
- browser/mobile rendered workflow and realtime behavior with real signed-in sessions;
- PayFast production configuration and provider-backed settlement/entitlement proof;
- backup/restore/rollback operational drill;
- Supabase leaked-password protection configuration;
- owner Android signing, Digital Asset Links, physical-device testing and Play internal/closed/pre-launch gates.

Overall release decision remains **RELEASE HOLD** until those external/owner/runtime gates are evidenced.
