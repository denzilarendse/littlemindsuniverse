-- Learner self-service dashboard reads for live pilot surfaces.
-- These RPCs intentionally expose only the signed-in learner's own classroom,
-- approved-report, and teacher-approved notification context.

create or replace function public.get_my_learner_classrooms()
returns table(
  classroom_id uuid,
  classroom_name text,
  curriculum_code text,
  age_band text,
  teacher_name text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id,
         c.name,
         c.curriculum_code,
         c.age_band,
         p.display_name,
         cm.joined_at
  from public.learners l
  join public.classroom_members cm
    on cm.learner_id = l.id
   and cm.status = 'active'
  join public.classrooms c
    on c.id = cm.classroom_id
   and c.active = true
  left join public.profiles p
    on p.id = c.teacher_profile_id
  where l.user_id = auth.uid()
    and l.active = true
  order by cm.joined_at desc;
$$;

revoke all on function public.get_my_learner_classrooms() from public;
grant execute on function public.get_my_learner_classrooms() to authenticated;


create or replace function public.get_my_learner_weekly_reports()
returns table(
  report_id uuid,
  classroom_id uuid,
  week_start date,
  status text,
  summary text,
  strengths text,
  next_steps text,
  home_support text,
  approved_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select wr.id,
         wr.classroom_id,
         wr.week_start,
         wr.status,
         wr.summary,
         wr.strengths,
         wr.next_steps,
         wr.home_support,
         wr.approved_at
  from public.learners l
  join public.weekly_reports wr
    on wr.learner_id = l.id
  where l.user_id = auth.uid()
    and l.active = true
    and wr.status = 'approved'
  order by wr.week_start desc, wr.approved_at desc nulls last
  limit 20;
$$;

revoke all on function public.get_my_learner_weekly_reports() from public;
grant execute on function public.get_my_learner_weekly_reports() to authenticated;


create or replace function public.get_my_learner_notifications()
returns table(
  notification_key text,
  notification_type text,
  title text,
  body text,
  occurred_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with mine as (
    select l.id
    from public.learners l
    where l.user_id = auth.uid()
      and l.active = true
    limit 1
  ),
  assignment_events as (
    select 'assignment:' || lir.learning_item_id::text as notification_key,
           'assignment'::text as notification_type,
           'New learning assigned'::text as title,
           coalesce(li.title, 'Learning activity') ||
             case when li.subject is not null and li.subject <> '' then ' · ' || li.subject else '' end as body,
           lir.assigned_at as occurred_at
    from mine m
    join public.learning_item_recipients lir on lir.learner_id = m.id
    join public.learning_items li on li.id = lir.learning_item_id
    where li.status = 'published'
  ),
  review_events as (
    select 'review:' || sr.id::text as notification_key,
           'review'::text as notification_type,
           'Teacher reviewed your work'::text as title,
           coalesce(nullif(sr.teacher_feedback, ''),
                    nullif(sr.recommended_next_step, ''),
                    'Your teacher review is ready.') as body,
           sr.created_at as occurred_at
    from mine m
    join public.learner_submissions ls on ls.learner_id = m.id
    join public.submission_reviews sr on sr.submission_id = ls.id
  ),
  report_events as (
    select 'report:' || wr.id::text as notification_key,
           'report'::text as notification_type,
           'Weekly report ready'::text as title,
           coalesce(nullif(wr.summary, ''), 'A teacher-approved weekly report is available.') as body,
           coalesce(wr.approved_at, wr.updated_at, wr.created_at) as occurred_at
    from mine m
    join public.weekly_reports wr on wr.learner_id = m.id
    where wr.status = 'approved'
  )
  select *
  from (
    select * from assignment_events
    union all
    select * from review_events
    union all
    select * from report_events
  ) events
  order by occurred_at desc
  limit 50;
$$;

revoke all on function public.get_my_learner_notifications() from public;
grant execute on function public.get_my_learner_notifications() to authenticated;
