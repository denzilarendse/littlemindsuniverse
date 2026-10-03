# Backup, restore and deletion gate

## Current engineering evidence

- Public account-removal queue exists behind authenticated RPCs.
- Direct anon/authenticated table access to privacy_requests is revoked.
- request_account_removal is profile-bound and idempotent.
- Retention cleanup is scheduled every 15 minutes and uses pg_net to invoke the protected retention Edge Function.
- The pg_net request queue was empty when audited on 3 October 2026.

## Backup / restore reality

Supabase hosted backup availability is plan-dependent. Current mission tooling can inspect database state but cannot prove a Dashboard backup exists or perform a no-cost restore-to-new-project drill.

A production in-place restore is destructive and creates downtime; it is not an acceptable test merely to obtain a checkbox.

## Required restore drill

Preferred safe path:
1. Confirm a recent hosted backup in Supabase Dashboard.
2. Record backup timestamp and recovery method.
3. Prefer **Restore to a New Project** for the drill when the plan supports it.
4. Confirm restored schema, auth users, profiles, RLS policies, functions and migration state.
5. Database backup restore does **not** restore deleted Storage objects; storage recovery needs separate evidence.
6. Verify required extensions, Edge Functions, Auth settings and Realtime settings because a restored clone may require manual reconfiguration.
7. Destroy the drill clone only after evidence is exported and only with owner/provider approval.

If hosted backups are unavailable, create an owner-controlled logical backup using the Supabase CLI db dump workflow and test restoration into a disposable environment.

## Primary sources

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
