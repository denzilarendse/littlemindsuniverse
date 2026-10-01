-- Stage 8 security-advisor hardening: document the intentional deny-by-default Data API posture
-- for push capability URLs while keeping mutations RPC-only.

begin;

drop policy if exists connect_push_subscriptions_explicit_deny
  on public.connect_push_subscriptions;

create policy connect_push_subscriptions_explicit_deny
on public.connect_push_subscriptions
for all
to authenticated
using (false)
with check (false);

commit;
