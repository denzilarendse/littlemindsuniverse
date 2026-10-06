-- Architecture 2.0 Stage 4: privacy-minimised early-learning progress summary.

create or replace function public.get_early_learning_summary(p_learner_id uuid)
returns table(
  session_count bigint,
  activity_count bigint,
  completed_sessions bigint,
  last_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.can_access_learner(p_learner_id) then
    raise exception 'You are not authorized to view this learner.';
  end if;

  return query
  select
    count(distinct s.id)::bigint as session_count,
    count(e.id) filter (
      where e.activity_type in ('activity_opened','learner_attempt','retry','transfer_check','activity_completed')
    )::bigint as activity_count,
    count(distinct s.id) filter (where s.status='completed')::bigint as completed_sessions,
    max(coalesce(e.occurred_at,s.started_at)) as last_activity_at
  from public.milo_learning_sessions s
  left join public.milo_learning_events e on e.session_id=s.id
  where s.learner_id=p_learner_id
    and s.engine in ('early_learning','play_story');
end;
$function$;

revoke all on function public.get_early_learning_summary(uuid) from public;
revoke all on function public.get_early_learning_summary(uuid) from anon;
grant execute on function public.get_early_learning_summary(uuid) to authenticated;
