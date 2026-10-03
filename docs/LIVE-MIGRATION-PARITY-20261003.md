# Live migration parity — 3 October 2026

Live project: `zcokxljcsfkrlouzragv`

## Purpose

The Git repository is currently a **delta-migration package for the existing LMU Supabase project**, not a complete zero-to-one bootstrap of every migration applied since project creation. This document prevents two unsafe assumptions:

1. a date-only source migration name is not necessarily missing merely because the live ledger has a timestamped name; and
2. copying every live migration back into Git under a second filename can cause duplicate DDL on a fresh replay.

## Release-critical live migrations now represented exactly

The following previously missing live migrations have exact source files on the hardening branch:

- `20260928203851_privacy_account_request_queue`
  → `database/migrations/20260928203851_privacy_account_request_queue.sql`
- `20261001133049_evidence_capture_status_verified_guardian`
  → `database/migrations/20261001133049_evidence_capture_status_verified_guardian.sql`
- `20261001133455_validate_private_media_evidence`
  → `database/migrations/20261001133455_validate_private_media_evidence.sql`
- `20261001134031_block_review_while_guardian_evidence_pending`
  → `database/migrations/20261001134031_block_review_while_guardian_evidence_pending.sql`
- `20261001213223_fix_account_removal_status_ambiguity`
  → existing source `database/migrations/20261001_fix_account_removal_status_ambiguity.sql`

The final item is intentionally mapped rather than duplicated: the live ledger contains the timestamped applied name while the repository already contains the equivalent repair under its established date-only filename.

## Architecture 2.0 mappings

These live ledger entries are already represented by existing source migrations with shorter repository filenames:

| Live migration | Repository source |
|---|---|
| 20261001134811 architecture_2_transactional_teacher_publish_and_privacy_deny | 20261001_transactional_teacher_publish_and_privacy_deny.sql |
| 20261001135002 architecture_2_milo_learning_os_foundation | 20261001_milo_learning_os_foundation.sql |
| 20261001140224 architecture_2_early_learning_summary | 20261001_early_learning_summary.sql |
| 20261001140450 architecture_2_milo_learning_os_advisor_hardening | 20261001_milo_learning_os_advisor_hardening.sql |
| 20261001163755 architecture_2_stage5_stage7_milo_engine_guards_and_tutor_catalog | 20261001_stage5_stage7_milo_engine_guards_and_tutor_catalog.sql |
| 20261001164921 architecture_2_connect_only_communication_cleanup | 20261001_connect_only_communication_cleanup.sql |
| 20261001165407 architecture_2_brilliant_milo_curriculum_session | 20261001_brilliant_milo_curriculum_session.sql |
| 20261001171947 architecture_2_support_group_management | 20261001_architecture_2_support_group_management.sql |
| 20261001173848 connect_stage8_realtime_offline_push | 20261001_connect_stage8_realtime_offline_push.sql |
| 20261001173920 connect_push_subscriptions_explicit_deny | 20261001_connect_push_subscriptions_explicit_deny.sql |
| 20261001174649 stage8_pilot_feedback | 20261001_stage8_pilot_feedback.sql |
| 20261001193825 stage8_index_pilot_feedback_profile | 20261001_stage8_index_pilot_feedback_profile.sql |

## Older project history

The live migration ledger begins in September 2026 and contains many earlier migrations that predate the currently curated Git migration folder. Those are part of the live database history but are not all reconstructed here.

That means disaster recovery must use one of these evidence-backed paths until a full canonical baseline is generated:

- a Supabase hosted backup / restore-to-new-project drill;
- an owner-controlled logical schema/data backup using the Supabase CLI;
- or a future canonical baseline migration produced from a verified clean database snapshot.

Do not claim that running `database/migrations/*.sql` alone can recreate the entire LMU database from an empty Postgres instance until that baseline work is completed.
