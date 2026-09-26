import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('../database/migrations/20260926_remaining_foreign_key_indexes.sql', import.meta.url),
  'utf8'
);

const expected = [
  ['evidence_approval_events_evidence_item_idx','evidence_approval_events','evidence_item_id'],
  ['evidence_approval_events_guardian_profile_idx','evidence_approval_events','guardian_profile_id'],
  ['guardian_consent_receipts_policy_version_idx','guardian_consent_receipts','policy_version_id'],
  ['guardian_evidence_consent_events_guardian_profile_idx','guardian_evidence_consent_events','guardian_profile_id'],
  ['guardian_evidence_consent_events_learner_idx','guardian_evidence_consent_events','learner_id'],
  ['guardian_evidence_consent_events_policy_version_idx','guardian_evidence_consent_events','policy_version_id'],
  ['guardian_evidence_consents_learner_idx','guardian_evidence_consents','learner_id'],
  ['guardian_evidence_consents_policy_version_idx','guardian_evidence_consents','policy_version_id'],
  ['guardian_feature_controls_learner_idx','guardian_feature_controls','learner_id'],
  ['guardian_learner_links_verified_by_idx','guardian_learner_links','verified_by'],
  ['learner_evidence_items_submission_idx','learner_evidence_items','submission_id'],
  ['learner_skill_mastery_skill_idx','learner_skill_mastery','skill_id'],
  ['learners_created_by_idx','learners','created_by'],
  ['learning_item_skills_skill_idx','learning_item_skills','skill_id'],
  ['learning_items_approved_by_idx','learning_items','approved_by'],
  ['mastery_evidence_learning_item_idx','mastery_evidence','learning_item_id'],
  ['mastery_evidence_skill_idx','mastery_evidence','skill_id'],
  ['mastery_evidence_submission_idx','mastery_evidence','submission_id'],
  ['milo_recommendations_approved_by_idx','milo_recommendations','approved_by'],
  ['milo_recommendations_group_classroom_idx','milo_recommendations','group_classroom_id'],
  ['milo_recommendations_rejected_by_idx','milo_recommendations','rejected_by'],
  ['milo_recommendations_skill_idx','milo_recommendations','skill_id'],
  ['notification_dispatches_learner_idx','notification_dispatches','learner_id'],
  ['organization_members_profile_idx','organization_members','profile_id'],
  ['organizations_owner_profile_idx','organizations','owner_profile_id'],
  ['payment_orders_organization_idx','payment_orders','organization_id'],
  ['payment_quotes_learner_idx','payment_quotes','learner_id'],
  ['payment_quotes_organization_idx','payment_quotes','organization_id'],
  ['payment_quotes_plan_code_idx','payment_quotes','plan_code']
];

test('remaining advisor-reported foreign keys receive covering indexes', () => {
  assert.equal(expected.length, 29);
  for (const [index, table, column] of expected) {
    assert.match(sql, new RegExp(`create index if not exists ${index}\\s+on public\\.${table}\\(${column}\\)`, 'i'));
  }
});

test('foreign-key index migration is additive only', () => {
  assert.doesNotMatch(sql, /\b(drop|delete|truncate|update|alter\s+table)\b/i);
});
