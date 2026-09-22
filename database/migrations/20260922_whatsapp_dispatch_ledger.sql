-- Durable server-only WhatsApp dispatch reservations.
-- Browser/authenticated clients must never write this table directly.

create table if not exists public.notification_dispatches (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  actor_profile_id uuid not null references public.profiles(id),
  learner_id uuid not null references public.learners(id),
  guardian_profile_id uuid not null references public.profiles(id),
  notification_type text not null,
  reference_id uuid not null,
  status text not null default 'reserved' check (status in ('reserved','sent','failed')),
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_dispatches_actor_created_idx
  on public.notification_dispatches(actor_profile_id, created_at desc);
create index if not exists notification_dispatches_guardian_created_idx
  on public.notification_dispatches(guardian_profile_id, created_at desc);

enable row level security on public.notification_dispatches;
revoke all on table public.notification_dispatches from anon, authenticated;
grant select, insert, update on table public.notification_dispatches to service_role;

create or replace function public.reserve_whatsapp_dispatch(
  p_idempotency_key text,
  p_actor_profile_id uuid,
  p_learner_id uuid,
  p_guardian_profile_id uuid,
  p_notification_type text,
  p_reference_id uuid
)
returns table(dispatch_id uuid, should_send boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.notification_dispatches%rowtype;
  v_id uuid;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 16 then
    raise exception 'A durable idempotency key is required.';
  end if;

  -- Serialize reservations for one actor so concurrent requests cannot bypass limits.
  perform pg_advisory_xact_lock(hashtextextended(p_actor_profile_id::text, 0));

  select * into v_existing
  from public.notification_dispatches
  where idempotency_key = p_idempotency_key;

  if found then
    return query select v_existing.id, false;
    return;
  end if;

  if (select count(*) from public.notification_dispatches
      where actor_profile_id = p_actor_profile_id
        and created_at >= now() - interval '1 minute') >= 10 then
    raise exception 'Messaging rate limit exceeded.';
  end if;

  if (select count(*) from public.notification_dispatches
      where actor_profile_id = p_actor_profile_id
        and created_at >= now() - interval '1 hour') >= 60 then
    raise exception 'Messaging hourly limit exceeded.';
  end if;

  if (select count(*) from public.notification_dispatches
      where guardian_profile_id = p_guardian_profile_id
        and created_at >= now() - interval '1 hour') >= 20 then
    raise exception 'Recipient messaging limit exceeded.';
  end if;

  insert into public.notification_dispatches(
    idempotency_key, actor_profile_id, learner_id, guardian_profile_id,
    notification_type, reference_id
  ) values (
    trim(p_idempotency_key), p_actor_profile_id, p_learner_id, p_guardian_profile_id,
    p_notification_type, p_reference_id
  ) returning id into v_id;

  return query select v_id, true;
end;
$$;

create or replace function public.complete_whatsapp_dispatch(
  p_dispatch_id uuid,
  p_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_dispatches
  set status='sent', provider_message_id=nullif(trim(p_provider_message_id),''),
      sent_at=coalesce(sent_at,now()), updated_at=now(), error_code=null
  where id=p_dispatch_id and status in ('reserved','sent');
  return found;
end;
$$;

create or replace function public.fail_whatsapp_dispatch(
  p_dispatch_id uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_dispatches
  set status='failed', error_code=left(coalesce(p_error_code,'provider_error'),120), updated_at=now()
  where id=p_dispatch_id and status='reserved';
  return found;
end;
$$;

revoke all on function public.reserve_whatsapp_dispatch(text,uuid,uuid,uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.complete_whatsapp_dispatch(uuid,text) from public, anon, authenticated;
revoke all on function public.fail_whatsapp_dispatch(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_whatsapp_dispatch(text,uuid,uuid,uuid,text,uuid) to service_role;
grant execute on function public.complete_whatsapp_dispatch(uuid,text) to service_role;
grant execute on function public.fail_whatsapp_dispatch(uuid,text) to service_role;
