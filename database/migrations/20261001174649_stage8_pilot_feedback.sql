-- Stage 8 controlled-pilot feedback channel.
-- Captures minimal authenticated product feedback without phone numbers or child-message content.

begin;

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  stage_code text check (stage_code is null or stage_code in ('EE24','F57','DB810','CA1113','PA1415','EDGE1618')),
  surface text not null check (surface in ('learning','milo','connect','classroom','reports','accessibility','android','other')),
  category text not null check (category in ('bug','usability','learning','safety','accessibility','performance','other')),
  severity text not null default 'observation' check (severity in ('observation','minor','blocking')),
  body text not null check (char_length(body) between 3 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists pilot_feedback_created_idx
  on public.pilot_feedback(created_at desc);

create index if not exists pilot_feedback_surface_category_idx
  on public.pilot_feedback(surface, category, created_at desc);

alter table public.pilot_feedback enable row level security;
revoke all on table public.pilot_feedback from public, anon, authenticated;

drop policy if exists pilot_feedback_explicit_deny on public.pilot_feedback;
create policy pilot_feedback_explicit_deny
on public.pilot_feedback
for all
to authenticated
using (false)
with check (false);

create or replace function public.submit_pilot_feedback(
  p_stage_code text,
  p_surface text,
  p_category text,
  p_severity text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_stage text := nullif(upper(btrim(coalesce(p_stage_code,''))),'');
  v_surface text := lower(btrim(coalesce(p_surface,'other')));
  v_category text := lower(btrim(coalesce(p_category,'other')));
  v_severity text := lower(btrim(coalesce(p_severity,'observation')));
  v_body text := btrim(coalesce(p_body,''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in to send pilot feedback.';
  end if;

  select p.role::text into v_role
  from public.profiles p
  where p.id = v_uid;

  if v_role is null then
    raise exception 'A valid profile is required.';
  end if;

  if v_stage is not null and v_stage not in ('EE24','F57','DB810','CA1113','PA1415','EDGE1618') then
    raise exception 'Unsupported learner stage.';
  end if;
  if v_surface not in ('learning','milo','connect','classroom','reports','accessibility','android','other') then
    raise exception 'Unsupported feedback surface.';
  end if;
  if v_category not in ('bug','usability','learning','safety','accessibility','performance','other') then
    raise exception 'Unsupported feedback category.';
  end if;
  if v_severity not in ('observation','minor','blocking') then
    raise exception 'Unsupported feedback severity.';
  end if;
  if char_length(v_body) < 3 or char_length(v_body) > 2000 then
    raise exception 'Feedback must contain 3 to 2000 characters.';
  end if;

  insert into public.pilot_feedback(profile_id,role,stage_code,surface,category,severity,body)
  values(v_uid,v_role,v_stage,v_surface,v_category,v_severity,v_body)
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.submit_pilot_feedback(text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.submit_pilot_feedback(text,text,text,text,text)
  to authenticated;

commit;
