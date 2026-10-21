import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  "database/migrations/20260928203851_privacy_account_request_queue.sql",
  "database/migrations/20261001133049_evidence_capture_status_verified_guardian.sql",
  "database/migrations/20261001133455_validate_private_media_evidence.sql",
  "database/migrations/20261001134031_block_review_while_guardian_evidence_pending.sql",
  "database/migrations/20261001134811_architecture_2_transactional_teacher_publish_and_privacy_deny.sql",
  "database/migrations/20261001135002_architecture_2_milo_learning_os_foundation.sql",
  "database/migrations/20261001140224_architecture_2_early_learning_summary.sql",
  "database/migrations/20261001140450_architecture_2_milo_learning_os_advisor_hardening.sql",
  "database/migrations/20261001163755_architecture_2_stage5_stage7_milo_engine_guards_and_tutor_catalog.sql",
  "database/migrations/20261001164921_architecture_2_connect_only_communication_cleanup.sql",
  "database/migrations/20261001165407_architecture_2_brilliant_milo_curriculum_session.sql",
  "database/migrations/20261001171947_architecture_2_support_group_management.sql",
  "database/migrations/20261001173848_connect_stage8_realtime_offline_push.sql",
  "database/migrations/20261001173920_connect_push_subscriptions_explicit_deny.sql",
  "database/migrations/20261001174649_stage8_pilot_feedback.sql",
  "database/migrations/20261001193825_stage8_index_pilot_feedback_profile.sql",
  "database/migrations/20261001213223_fix_account_removal_status_ambiguity.sql"
];

test('canonical source contains every recovered live migration through Stage 8D', () => {
  for (const relative of required) {
    const full = path.join(root, relative);
    assert.ok(fs.existsSync(full), `missing live migration source: ${relative}`);
    assert.ok(fs.statSync(full).size > 0, `empty live migration source: ${relative}`);
  }
});
