# Supabase security disposition — 3 October 2026

Project: `zcokxljcsfkrlouzragv`

## Executed evidence

- 48 public tables inspected.
- 48/48 public tables have RLS enabled.
- 3 Auth users and 3 profiles were present at the last integrity audit, with 0 Auth users missing profiles.
- All browser-callable SECURITY DEFINER RPCs inspected were denied to `anon`, executable only where intentionally granted to `authenticated`, and contained an `auth.uid()` authorization check.
- Internal payment, retention and helper functions that are not browser APIs remain non-executable by `authenticated`.
- A synthetic non-login Auth row verified the live `handle_new_user` trigger creates a parent profile and 7-day trial. The synthetic Auth/profile/trial rows were then deleted and cleanup verified at 0 rows.

## Remaining advisor findings

### pg_net installed in public

Current state:
- pg_net version: 0.20.4
- extension schema: public
- pending request queue at audit: 0
- stored responses at audit: 24
- active LMU cron job calls `net.http_post` every 15 minutes for evidence-retention cleanup.

Supabase documents that pg_net is non-relocatable: moving it requires dropping and recreating the extension. Dropping removes request/response objects and any pending requests. Because LMU actively depends on pg_net for retention cleanup, this warning is **not** being bulk-remediated during an ordinary release branch. Move it only during an explicit database maintenance window with queue=0, retention-job verification and rollback evidence.

Reference:
https://supabase.com/docs/guides/database/extensions/pg_net

### Leaked password protection disabled

Supabase recommends leaked-password protection, which checks passwords against HaveIBeenPwned. The feature is available on Pro Plan and above.

This mission's Supabase connector does not expose the hosted Auth setting needed to enable it and cannot determine the billing plan. Enable it in Authentication settings when the project plan supports it, then rerun the security advisor.

Reference:
https://supabase.com/docs/guides/auth/password-security

## Release disposition

- RLS: VERIFIED
- anonymous privileged RPC execution: DENIED
- authenticated privileged RPC authorization checks: VERIFIED
- leaked-password protection: BLOCKED on hosted Auth setting/plan
- pg_net schema warning: ACCEPTED TEMPORARILY because active retention cleanup depends on it; maintenance migration prepared conceptually, not executed blindly
