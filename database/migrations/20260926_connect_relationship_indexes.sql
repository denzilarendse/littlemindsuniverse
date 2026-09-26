-- Cover high-frequency LittleMinds Connect and guardian authorization foreign keys.
-- These indexes support RLS/RPC relationship checks and remove unnecessary
-- sequential scans as conversations and memberships grow.

create index if not exists connect_business_accounts_owner_profile_idx
  on public.connect_business_accounts(owner_profile_id);

create index if not exists connect_business_members_profile_idx
  on public.connect_business_members(profile_id);

create index if not exists connect_conversations_created_by_idx
  on public.connect_conversations(created_by);

create index if not exists connect_conversations_guardian_profile_idx
  on public.connect_conversations(guardian_profile_id);

create index if not exists connect_conversations_learner_idx
  on public.connect_conversations(learner_id);

create index if not exists connect_conversations_teacher_profile_idx
  on public.connect_conversations(teacher_profile_id);

create index if not exists connect_messages_reply_to_idx
  on public.connect_messages(reply_to_message_id);

create index if not exists connect_messages_sender_profile_idx
  on public.connect_messages(sender_profile_id);

create index if not exists connect_receipts_profile_idx
  on public.connect_receipts(profile_id);

create index if not exists guardian_learner_links_learner_idx
  on public.guardian_learner_links(learner_id);
