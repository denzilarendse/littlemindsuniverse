# LMU post-launch operations

Post-launch cannot be marked complete before a real release and observed traffic exist. This document defines the operational evidence required immediately after release.

## First 24 hours

Monitor:
- authentication/signup failures;
- password-recovery failures;
- API 4xx/5xx rates;
- Milo provider failures and rate-limit errors;
- Connect send/read/realtime errors;
- evidence upload/retention failures;
- Supabase Postgres errors;
- Android crashes/ANRs and Play pre-launch/runtime reports;
- account-removal/privacy-request failures.

## Release health checks

- production HTTPS and security headers;
- /api/health;
- browser-safe runtime config;
- privacy policy and public deletion resource;
- service-worker cache boundary;
- exact Android release artifact/signature/hash;
- database RLS and security advisors.

## Rollback rule

Rollback only when a verified production defect is more dangerous than rollback itself. Preserve the current release SHA, previous deployment identifier, database migration state and signed artifact hashes before any promotion.

## Incident severity

- P0: child safety, auth bypass, privacy breach, destructive data loss, signing compromise.
- P1: signup/login unavailable, core learning unavailable, widespread Connect failure, corrupted submissions.
- P2: degraded non-critical feature or limited cohort issue.
- P3: cosmetic/usability defect.

P0 triggers immediate release hold/rollback evaluation.
