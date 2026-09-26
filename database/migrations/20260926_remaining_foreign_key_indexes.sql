-- Cover the remaining foreign keys reported by the Supabase performance advisor.
-- These indexes are additive only and improve relationship checks, deletes/updates
-- of referenced rows, audit lookups, evidence flows, mastery, organizations and payments.

create index if not exists evidence_approval_events_evidence_item_idx
  on public.evidence_approval_events(evidence_item_id);
create index if not exists evidence_approval_events_guardian_profile_idx
  on public.evidence_approval_events(guardian_profile_id);
create index if not exists guardian_consent_receipts_policy_version_idx
  on public.guardian_consent_receipts(policy_version_id);
create index if not exists guardian_evidence_consent_events_guardian_profile_idx
  on public.guardian_evidence_consent_events(guardian_profile_id);
create index if not exists guardian_evidence_consent_events_learner_idx
  on public.guardian_evidence_consent_events(learner_id);
create index if not exists guardian_evidence_consent_events_policy_version_idx
  on public.guardian_evidence_consent_events(policy_version_id);
create index if not exists guardian_evidence_consents_learner_idx
  on public.guardian_evidence_consents(learner_id);
create index if not exists guardian_evidence_consents_policy_version_idx
  on public.guardian_evidence_consents(policy_version_id);
create index if not exists guardian_feature_controls_learner_idx
  on public.guardian_feature_controls(learner_id);
create index if not exists guardian_learner_links_verified_by_idx
  on public.guardian_learner_links(verified_by);
create index if not exists learner_evidence_items_submission_idx
  on public.learner_evidence_items(submission_id);
create index if not exists learner_skill_mastery_skill_idx
  on public.learner_skill_mastery(skill_id);
create index if not exists learners_created_by_idx
  on public.learners(created_by);
create index if not exists learning_item_skills_skill_idx
  on public.learning_item_skills(skill_id);
create index if not exists learning_items_approved_by_idx
  on public.learning_items(approved_by);
create index if not exists mastery_evidence_learning_item_idx
  on public.mastery_evidence(learning_item_id);
create index if not exists mastery_evidence_skill_idx
  on public.mastery_evidence(skill_id);
create index if not exists mastery_evidence_submission_idx
  on public.mastery_evidence(submission_id);
create index if not exists milo_recommendations_approved_by_idx
  on public.milo_recommendations(approved_by);
create index if not exists milo_recommendations_group_classroom_idx
  on public.milo_recommendations(group_classroom_id);
create index if not exists milo_recommendations_rejected_by_idx
  on public.milo_recommendations(rejected_by);
create index if not exists milo_recommendations_skill_idx
  on public.milo_recommendations(skill_id);
create index if not exists notification_dispatches_learner_idx
  on public.notification_dispatches(learner_id);
create index if not exists organization_members_profile_idx
  on public.organization_members(profile_id);
create index if not exists organizations_owner_profile_idx
  on public.organizations(owner_profile_id);
create index if not exists payment_orders_organization_idx
  on public.payment_orders(organization_id);
create index if not exists payment_quotes_learner_idx
  on public.payment_quotes(learner_id);
create index if not exists payment_quotes_organization_idx
  on public.payment_quotes(organization_id);
create index if not exists payment_quotes_plan_code_idx
  on public.payment_quotes(plan_code);
