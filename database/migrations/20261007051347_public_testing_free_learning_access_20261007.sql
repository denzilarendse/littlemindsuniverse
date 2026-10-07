-- Public testing must exercise the full learning journey without a payment gate.
-- Keep authentication, assignment, guardian/teacher relationships, RLS and
-- evidence consent boundaries unchanged. This flag is private and reversible:
-- setting public_testing_mode=false restores the existing week-one/premium gate.

create table if not exists private.runtime_flags (
  flag_key text primary key,
  enabled boolean not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.runtime_flags from public, anon, authenticated;

insert into private.runtime_flags(flag_key, enabled, updated_at)
values ('public_testing_mode', true, now())
on conflict(flag_key) do update
set enabled = excluded.enabled,
    updated_at = excluded.updated_at;

create or replace function private.public_testing_mode_enabled()
returns boolean
language sql
stable
security definer
set search_path = private, pg_temp
as $$
  select coalesce((
    select rf.enabled
    from private.runtime_flags rf
    where rf.flag_key = 'public_testing_mode'
  ), false);
$$;

revoke all on function private.public_testing_mode_enabled()
from public, anon, authenticated;

create or replace function private.has_commercial_learning_access(
  p_learner_id uuid,
  p_learning_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1
    from public.learning_items li
    join public.learning_item_recipients lir
      on lir.learning_item_id = li.id
     and lir.learner_id = p_learner_id
    where li.id = p_learning_item_id
      and li.status in ('published', 'closed')
      and (
        private.public_testing_mode_enabled()
        or li.week_number = 1
        or public.has_premium_access(p_learner_id)
      )
  );
$$;

create or replace function public.has_commercial_learning_access(
  p_learner_id uuid,
  p_learning_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.learning_items li
    join public.learning_item_recipients lir
      on lir.learning_item_id = li.id
     and lir.learner_id = p_learner_id
    where li.id = p_learning_item_id
      and li.status in ('published', 'closed')
      and (
        private.public_testing_mode_enabled()
        or li.week_number = 1
        or public.has_premium_access(p_learner_id)
      )
  );
$$;

create or replace function public.begin_learner_week(
  p_learner_id uuid,
  p_curriculum_code text,
  p_year_level text,
  p_week_number integer
)
returns table(
  access_allowed boolean,
  paywall_required boolean,
  reason text,
  trial_active boolean,
  premium_access boolean
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_role public.app_role;
  v_trial_profile uuid;
  v_trial public.account_trials%rowtype;
  v_premium boolean;
  v_is_learner boolean;
  v_is_guardian boolean;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;
  if p_week_number < 1 or p_week_number > 40 then
    raise exception 'Week number must be between 1 and 40.';
  end if;
  if trim(coalesce(p_curriculum_code, '')) = ''
     or trim(coalesce(p_year_level, '')) = '' then
    raise exception 'Curriculum and year level are required.';
  end if;

  select role into v_role
  from public.profiles
  where id = v_uid;

  select exists(
    select 1
    from public.learners l
    where l.id = p_learner_id
      and l.user_id = v_uid
      and l.active = true
  ) into v_is_learner;

  select exists(
    select 1
    from public.guardian_learner_links gl
    where gl.learner_id = p_learner_id
      and gl.guardian_profile_id = v_uid
      and gl.verified = true
  ) into v_is_guardian;

  if not (v_is_learner or v_is_guardian) then
    raise exception 'Only the learner or a verified guardian may start a learner week.';
  end if;

  if private.public_testing_mode_enabled() then
    insert into public.learner_week_progress(
      learner_id,
      curriculum_code,
      year_level,
      week_number,
      first_started_at
    ) values (
      p_learner_id,
      trim(p_curriculum_code),
      trim(p_year_level),
      p_week_number,
      now()
    )
    on conflict(learner_id, curriculum_code, year_level, week_number)
    do update set first_started_at = coalesce(
      public.learner_week_progress.first_started_at,
      excluded.first_started_at
    );

    return query select
      true,
      false,
      'public_testing'::text,
      false,
      public.has_premium_access(p_learner_id);
    return;
  end if;

  if v_role = 'parent' then
    v_trial_profile := v_uid;
  else
    select gl.guardian_profile_id into v_trial_profile
    from public.guardian_learner_links gl
    where gl.learner_id = p_learner_id
      and gl.verified = true
    order by gl.primary_guardian desc, gl.created_at
    limit 1;
  end if;

  if v_trial_profile is not null then
    update public.account_trials
    set ended_at = scheduled_ends_at,
        end_reason = 'elapsed'
    where profile_id = v_trial_profile
      and ended_at is null
      and scheduled_ends_at <= now();

    select * into v_trial
    from public.account_trials
    where profile_id = v_trial_profile
    for update;
  end if;

  v_premium := public.has_premium_access(p_learner_id);

  if p_week_number >= 2 and not v_premium then
    if v_trial.profile_id is not null and v_trial.ended_at is null then
      update public.account_trials
      set ended_at = now(),
          end_reason = 'week_2_reached'
      where profile_id = v_trial.profile_id;
      v_trial.ended_at := now();
      v_trial.end_reason := 'week_2_reached';
    end if;

    return query select
      false,
      true,
      'payment_required'::text,
      false,
      v_premium;
    return;
  end if;

  insert into public.learner_week_progress(
    learner_id,
    curriculum_code,
    year_level,
    week_number,
    first_started_at
  ) values (
    p_learner_id,
    trim(p_curriculum_code),
    trim(p_year_level),
    p_week_number,
    now()
  )
  on conflict(learner_id, curriculum_code, year_level, week_number)
  do update set first_started_at = coalesce(
    public.learner_week_progress.first_started_at,
    excluded.first_started_at
  );

  return query select
    true,
    false,
    case when p_week_number = 1 then 'week_one_free' else 'premium_access' end,
    (
      v_trial.profile_id is not null
      and v_trial.ended_at is null
      and v_trial.scheduled_ends_at > now()
    ),
    v_premium;
end;
$function$;
