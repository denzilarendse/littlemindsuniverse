-- Architecture 2.0 Stage 8: make LittleMinds Connect the only communication model.
-- Removes retired external-provider contact/dispatch artifacts from the canonical schema.

begin;

drop policy if exists guardian_requests_learner_link on public.guardian_learner_links;
create policy guardian_requests_learner_link
on public.guardian_learner_links
for insert
to authenticated
with check (
  guardian_profile_id = (select auth.uid())
  and verified = false
  and verified_at is null
  and verified_by is null
  and primary_guardian = false
  and can_receive_reports = false
  and can_approve_evidence = false
  and can_receive_evidence_requests = false
  and can_receive_class_messages = false
);

create or replace function public.guard_unverified_guardian_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.verified=false then
    new.primary_guardian := false;
    new.can_receive_reports := false;
    new.can_approve_evidence := false;
    new.can_receive_evidence_requests := false;
    new.can_receive_class_messages := false;
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$function$;
revoke all on function public.guard_unverified_guardian_link() from public, anon, authenticated;

create or replace function public.create_managed_learner(
  p_display_name text,
  p_stage_code text default 'EE24',
  p_curriculum_code text default 'CAPS',
  p_country_code text default 'ZA'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_name text := trim(coalesce(p_display_name,''));
  v_stage text := upper(trim(coalesce(p_stage_code,'EE24')));
  v_curriculum text := upper(trim(coalesce(p_curriculum_code,'CAPS')));
  v_country text := upper(trim(coalesce(p_country_code,'ZA')));
begin
  if v_uid is null then raise exception 'You must be signed in.'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_uid and p.role='parent'::public.app_role) then
    raise exception 'Parent or guardian account required.';
  end if;
  if char_length(v_name)<1 or char_length(v_name)>80 then raise exception 'Learner name must contain between 1 and 80 characters.'; end if;
  if v_stage not in ('EE24','F57','DB810','CA1113','PA1415','EDGE1618') then raise exception 'Unsupported LittleMinds stage.'; end if;
  if v_country !~ '^[A-Z]{2}$' then raise exception 'Country code must contain two letters.'; end if;

  insert into public.learners(user_id,created_by,display_name,country_code,curriculum_code,stage_code,active)
  values(null,v_uid,v_name,v_country,v_curriculum,v_stage,true)
  returning id into v_id;

  insert into public.guardian_learner_links(
    guardian_profile_id,learner_id,relationship,primary_guardian,
    can_receive_reports,can_approve_evidence,
    can_receive_evidence_requests,can_receive_class_messages,
    child_facing_label,verified,verified_at,verified_by
  ) values(
    v_uid,v_id,'parent',true,
    true,true,true,true,
    'Parent',true,now(),v_uid
  );

  return v_id;
end;
$function$;
revoke all on function public.create_managed_learner(text,text,text,text) from public, anon;
grant execute on function public.create_managed_learner(text,text,text,text) to authenticated;

drop function if exists public.get_parent_notification_preferences();
create function public.get_parent_notification_preferences()
returns table(
  learner_id uuid,
  learner_name text,
  can_receive_reports boolean,
  can_receive_evidence_requests boolean,
  can_receive_class_messages boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  return query
  select l.id,l.display_name,gl.can_receive_reports,
         gl.can_receive_evidence_requests,gl.can_receive_class_messages
  from public.guardian_learner_links gl
  join public.learners l on l.id=gl.learner_id
  where gl.guardian_profile_id=(select auth.uid())
    and gl.verified=true and l.active=true
  order by l.display_name;
end;
$function$;
revoke all on function public.get_parent_notification_preferences() from public, anon;
grant execute on function public.get_parent_notification_preferences() to authenticated;

drop function if exists public.set_parent_notification_preferences(uuid,boolean,boolean,boolean,boolean);
create function public.set_parent_notification_preferences(
  p_learner_id uuid,
  p_can_receive_reports boolean,
  p_can_receive_evidence_requests boolean,
  p_can_receive_class_messages boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  update public.guardian_learner_links
  set can_receive_reports=coalesce(p_can_receive_reports,can_receive_reports),
      can_receive_evidence_requests=coalesce(p_can_receive_evidence_requests,can_receive_evidence_requests),
      can_receive_class_messages=coalesce(p_can_receive_class_messages,can_receive_class_messages)
  where guardian_profile_id=(select auth.uid())
    and learner_id=p_learner_id
    and verified=true;
  if not found then raise exception 'Verified linked learner not found.'; end if;
  return true;
end;
$function$;
revoke all on function public.set_parent_notification_preferences(uuid,boolean,boolean,boolean) from public, anon;
grant execute on function public.set_parent_notification_preferences(uuid,boolean,boolean,boolean) to authenticated;

drop function if exists public.set_parent_whatsapp_contact(text,boolean);
drop function if exists public.reserve_whatsapp_dispatch(text,uuid,uuid,uuid,text,uuid);
drop function if exists public.complete_whatsapp_dispatch(uuid,text);
drop function if exists public.fail_whatsapp_dispatch(uuid,text);
drop table if exists public.whatsapp_contacts;
drop table if exists public.notification_dispatches;
alter table public.guardian_learner_links drop column if exists can_receive_whatsapp;

commit;