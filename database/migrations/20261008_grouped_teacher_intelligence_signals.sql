-- LMU Phase 1B: Grouped Misconception & Strength Detection.
-- Deterministic, explainable rules over teacher-reviewed mastery evidence.
-- Milo does not diagnose learners or activate interventions here.

alter table public.teacher_intelligence_signals
  add column if not exists evidence_sufficiency text not null default 'sufficient'
    check (evidence_sufficiency in ('insufficient','sufficient')),
  add column if not exists source_key text,
  add column if not exists learner_count_snapshot integer not null default 0
    check (learner_count_snapshot >= 0);

create index if not exists teacher_intelligence_signals_source_key_idx
  on public.teacher_intelligence_signals(classroom_id, source, source_key)
  where source_key is not null;

create or replace function public.refresh_teacher_intelligence_signals(
  p_classroom_id uuid
)
returns table(
  signal_type text,
  signal_count integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_active integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.teacher_owns_classroom(p_classroom_id) then
    raise exception 'You are not authorized to refresh teacher intelligence for this classroom.';
  end if;

  if not exists (
    select 1
    from public.classrooms c
    where c.id = p_classroom_id
      and c.classroom_type::text = 'normal'
      and c.active = true
  ) then
    raise exception 'Teacher intelligence refresh requires an active normal classroom.';
  end if;

  select count(*)::integer
    into v_active
  from public.classroom_members cm
  join public.learners l on l.id = cm.learner_id
  where cm.classroom_id = p_classroom_id
    and cm.status::text = 'active'
    and l.active = true;

  -- Rebuild only undecided Phase 1B machine proposals.
  -- Teacher-reviewed or later lifecycle states are preserved.
  delete from public.teacher_intelligence_signals tis
  where tis.classroom_id = p_classroom_id
    and tis.source = 'phase1b_rules_v1'
    and tis.status = 'proposed';

  -- Individual learning-need signals from reviewed mastery.
  insert into public.teacher_intelligence_signals(
    classroom_id, skill_id, signal_type, title, rationale,
    strength_asset, next_learning_goal, recommended_action,
    confidence, evidence_sufficiency, evidence_summary,
    contradictory_evidence, status, source, source_key,
    learner_count_snapshot
  )
  select
    p_classroom_id,
    lsm.skill_id,
    'individual',
    l.display_name || ' may need support with ' || s.name,
    'Teacher-reviewed mastery currently shows ' ||
      replace(lsm.current_judgement::text, '_', ' ') ||
      ' with ' || lsm.evidence_count || ' evidence item' ||
      case when lsm.evidence_count = 1 then '' else 's' end ||
      case when lsm.misconception_count > 0
        then ' and ' || lsm.misconception_count || ' recorded misconception' ||
             case when lsm.misconception_count = 1 then '' else 's' end
        else '' end || '.',
    case
      when lsm.independent_evidence_count > 0
        then lsm.independent_evidence_count || ' independent evidence item' ||
             case when lsm.independent_evidence_count = 1 then '' else 's' end ||
             ' can be used as a starting asset.'
      else null
    end,
    'Demonstrate ' || s.name || ' independently on a new example.',
    case
      when lsm.evidence_count < 2
        then 'Collect another teacher-reviewed or independent observation before starting an intervention.'
      else 'Review the evidence and decide whether targeted support is appropriate.'
    end,
    case
      when lsm.evidence_count >= 3 and lsm.independent_evidence_count >= 1 then 'high'
      when lsm.evidence_count >= 2 then 'medium'
      else 'low'
    end,
    case when lsm.evidence_count < 2 then 'insufficient' else 'sufficient' end,
    jsonb_build_object(
      'judgement', lsm.current_judgement::text,
      'masteryConfidence', lsm.confidence::text,
      'trend', lsm.trend::text,
      'evidenceCount', lsm.evidence_count,
      'independentEvidenceCount', lsm.independent_evidence_count,
      'assistedEvidenceCount', lsm.assisted_evidence_count,
      'misconceptionCount', lsm.misconception_count,
      'lastEvidenceAt', lsm.last_evidence_at
    ),
    case
      when lsm.current_judgement::text in ('secure','strong')
        then jsonb_build_array(jsonb_build_object('type','current_mastery','value',lsm.current_judgement::text))
      else '[]'::jsonb
    end,
    'proposed',
    'phase1b_rules_v1',
    'individual:' || lsm.learner_id::text || ':' || lsm.skill_id::text,
    1
  from public.classroom_members cm
  join public.learners l
    on l.id = cm.learner_id and l.active = true
  join public.learner_skill_mastery lsm
    on lsm.learner_id = cm.learner_id
  join public.skills s
    on s.id = lsm.skill_id and s.active = true
  where cm.classroom_id = p_classroom_id
    and cm.status::text = 'active'
    and (
      lsm.current_judgement::text in ('not_yet','developing')
      or lsm.misconception_count > 0
    );

  insert into public.teacher_intelligence_signal_learners(
    signal_id, learner_id, inclusion_reason, evidence_count,
    independent_evidence_count, assisted_evidence_count,
    misconception_count, confidence
  )
  select
    tis.id,
    lsm.learner_id,
    'Included because teacher-reviewed mastery shows ' ||
      replace(lsm.current_judgement::text, '_', ' ') ||
      case when lsm.misconception_count > 0
        then ' with recorded misconception evidence'
        else '' end || '.',
    lsm.evidence_count,
    lsm.independent_evidence_count,
    lsm.assisted_evidence_count,
    lsm.misconception_count,
    tis.confidence
  from public.teacher_intelligence_signals tis
  join public.learner_skill_mastery lsm
    on tis.source_key = 'individual:' || lsm.learner_id::text || ':' || lsm.skill_id::text
  join public.classroom_members cm
    on cm.classroom_id = tis.classroom_id
   and cm.learner_id = lsm.learner_id
   and cm.status::text = 'active'
  where tis.classroom_id = p_classroom_id
    and tis.source = 'phase1b_rules_v1'
    and tis.signal_type = 'individual'
  on conflict (signal_id, learner_id) do nothing;

  -- Shared exact misconception clusters.
  -- Normalization is intentionally conservative: trim, lowercase and collapse whitespace.
  with normalized as (
    select
      me.skill_id,
      me.learner_id,
      lower(regexp_replace(trim(me.misconception), '\s+', ' ', 'g')) as misconception_key,
      max(me.misconception) as misconception_example,
      count(*)::integer as evidence_count,
      count(*) filter (where me.independent_evidence)::integer as independent_count,
      count(*) filter (where not me.independent_evidence)::integer as assisted_count,
      max(me.observed_at) as last_observed_at
    from public.mastery_evidence me
    join public.classroom_members cm
      on cm.learner_id = me.learner_id
     and cm.classroom_id = p_classroom_id
     and cm.status::text = 'active'
    where me.misconception is not null
      and char_length(trim(me.misconception)) >= 3
      and me.observed_at >= now() - interval '90 days'
    group by me.skill_id, me.learner_id,
      lower(regexp_replace(trim(me.misconception), '\s+', ' ', 'g'))
  ),
  clusters as (
    select
      n.skill_id,
      n.misconception_key,
      max(n.misconception_example) as misconception_example,
      count(distinct n.learner_id)::integer as learner_count,
      sum(n.evidence_count)::integer as evidence_count,
      sum(n.independent_count)::integer as independent_count,
      sum(n.assisted_count)::integer as assisted_count,
      max(n.last_observed_at) as last_observed_at
    from normalized n
    group by n.skill_id, n.misconception_key
    having count(distinct n.learner_id) >= 2
  )
  insert into public.teacher_intelligence_signals(
    classroom_id, skill_id, signal_type, title, rationale,
    strength_asset, next_learning_goal, recommended_action,
    confidence, evidence_sufficiency, evidence_summary,
    contradictory_evidence, status, source, source_key,
    learner_count_snapshot
  )
  select
    p_classroom_id,
    c.skill_id,
    'group',
    c.learner_count || ' learners share a misconception in ' || s.name,
    'The same teacher-reviewed misconception text recurs for ' ||
      c.learner_count || ' learners: "' || left(c.misconception_example, 280) || '".',
    case
      when c.independent_count > 0
        then c.independent_count || ' independent evidence item' ||
             case when c.independent_count = 1 then '' else 's' end ||
             ' are available to compare with assisted attempts.'
      else null
    end,
    'Address the shared misconception, then require each learner to demonstrate ' ||
      s.name || ' independently on a different example.',
    'Review the learner list and evidence. If the pattern is valid, consider one temporary support group rather than separate duplicate interventions.',
    case
      when c.learner_count >= 3 and c.evidence_count >= c.learner_count * 2 then 'high'
      else 'medium'
    end,
    'sufficient',
    jsonb_build_object(
      'clusterMethod','exact_normalized_teacher_misconception',
      'misconception',c.misconception_example,
      'learnerCount',c.learner_count,
      'evidenceCount',c.evidence_count,
      'independentEvidenceCount',c.independent_count,
      'assistedEvidenceCount',c.assisted_count,
      'lastObservedAt',c.last_observed_at
    ),
    '[]'::jsonb,
    'proposed',
    'phase1b_rules_v1',
    'group-misconception:' || c.skill_id::text || ':' || md5(c.misconception_key),
    c.learner_count
  from clusters c
  join public.skills s on s.id = c.skill_id and s.active = true;

  with normalized as (
    select
      me.skill_id,
      me.learner_id,
      lower(regexp_replace(trim(me.misconception), '\s+', ' ', 'g')) as misconception_key,
      count(*)::integer as evidence_count,
      count(*) filter (where me.independent_evidence)::integer as independent_count,
      count(*) filter (where not me.independent_evidence)::integer as assisted_count
    from public.mastery_evidence me
    join public.classroom_members cm
      on cm.learner_id = me.learner_id
     and cm.classroom_id = p_classroom_id
     and cm.status::text = 'active'
    where me.misconception is not null
      and char_length(trim(me.misconception)) >= 3
      and me.observed_at >= now() - interval '90 days'
    group by me.skill_id, me.learner_id,
      lower(regexp_replace(trim(me.misconception), '\s+', ' ', 'g'))
  ),
  clustered as (
    select skill_id, misconception_key
    from normalized
    group by skill_id, misconception_key
    having count(distinct learner_id) >= 2
  )
  insert into public.teacher_intelligence_signal_learners(
    signal_id, learner_id, inclusion_reason, evidence_count,
    independent_evidence_count, assisted_evidence_count,
    misconception_count, confidence
  )
  select
    tis.id,
    n.learner_id,
    'Included because the same teacher-reviewed misconception appears for multiple learners in this classroom.',
    n.evidence_count,
    n.independent_count,
    n.assisted_count,
    n.evidence_count,
    tis.confidence
  from public.teacher_intelligence_signals tis
  join clustered c
    on tis.source_key = 'group-misconception:' || c.skill_id::text || ':' || md5(c.misconception_key)
  join normalized n
    on n.skill_id = c.skill_id
   and n.misconception_key = c.misconception_key
  where tis.classroom_id = p_classroom_id
    and tis.source = 'phase1b_rules_v1'
    and tis.signal_type = 'group'
  on conflict (signal_id, learner_id) do nothing;

  -- Generic shared skill need only when no repeated exact misconception cluster exists for that skill.
  with needs as (
    select
      lsm.skill_id,
      count(distinct lsm.learner_id)::integer as learner_count,
      sum(lsm.evidence_count)::integer as evidence_count,
      sum(lsm.independent_evidence_count)::integer as independent_count,
      sum(lsm.assisted_evidence_count)::integer as assisted_count,
      sum(lsm.misconception_count)::integer as misconception_count
    from public.learner_skill_mastery lsm
    join public.classroom_members cm
      on cm.learner_id = lsm.learner_id
     and cm.classroom_id = p_classroom_id
     and cm.status::text = 'active'
    where lsm.current_judgement::text in ('not_yet','developing')
       or lsm.misconception_count > 0
    group by lsm.skill_id
    having count(distinct lsm.learner_id) >= 2
  )
  insert into public.teacher_intelligence_signals(
    classroom_id, skill_id, signal_type, title, rationale,
    strength_asset, next_learning_goal, recommended_action,
    confidence, evidence_sufficiency, evidence_summary,
    contradictory_evidence, status, source, source_key,
    learner_count_snapshot
  )
  select
    p_classroom_id,
    n.skill_id,
    'group',
    n.learner_count || ' learners may need support with ' || s.name,
    n.learner_count || ' active learners currently show teacher-reviewed evidence of not-yet/developing mastery or recorded misconceptions in this skill.',
    case when n.independent_count > 0
      then n.independent_count || ' independent evidence items are available across the group.'
      else null end,
    'Clarify the shared skill need and then check each learner independently.',
    'Review the learners before creating a temporary group. Their underlying misconceptions may still differ.',
    case when n.evidence_count >= n.learner_count * 2 then 'medium' else 'low' end,
    case when n.evidence_count >= n.learner_count * 2 then 'sufficient' else 'insufficient' end,
    jsonb_build_object(
      'clusterMethod','shared_skill_need',
      'learnerCount',n.learner_count,
      'evidenceCount',n.evidence_count,
      'independentEvidenceCount',n.independent_count,
      'assistedEvidenceCount',n.assisted_count,
      'misconceptionCount',n.misconception_count
    ),
    '[]'::jsonb,
    'proposed',
    'phase1b_rules_v1',
    'group-skill:' || n.skill_id::text,
    n.learner_count
  from needs n
  join public.skills s on s.id = n.skill_id and s.active = true
  where not exists (
    select 1
    from public.teacher_intelligence_signals tis2
    where tis2.classroom_id = p_classroom_id
      and tis2.source = 'phase1b_rules_v1'
      and tis2.signal_type = 'group'
      and tis2.skill_id = n.skill_id
      and tis2.source_key like 'group-misconception:%'
  );

  insert into public.teacher_intelligence_signal_learners(
    signal_id, learner_id, inclusion_reason, evidence_count,
    independent_evidence_count, assisted_evidence_count,
    misconception_count, confidence
  )
  select
    tis.id,
    lsm.learner_id,
    'Included because this learner has teacher-reviewed evidence of a current need in the same skill as other learners.',
    lsm.evidence_count,
    lsm.independent_evidence_count,
    lsm.assisted_evidence_count,
    lsm.misconception_count,
    tis.confidence
  from public.teacher_intelligence_signals tis
  join public.learner_skill_mastery lsm
    on tis.source_key = 'group-skill:' || lsm.skill_id::text
  join public.classroom_members cm
    on cm.classroom_id = tis.classroom_id
   and cm.learner_id = lsm.learner_id
   and cm.status::text = 'active'
  where tis.classroom_id = p_classroom_id
    and tis.source = 'phase1b_rules_v1'
    and tis.signal_type = 'group'
    and tis.source_key like 'group-skill:%'
    and (
      lsm.current_judgement::text in ('not_yet','developing')
      or lsm.misconception_count > 0
    )
  on conflict (signal_id, learner_id) do nothing;

  -- Class-level signal only when at least half the active class and at least 3 learners share a skill need.
  with class_need as (
    select
      lsm.skill_id,
      count(distinct lsm.learner_id)::integer as learner_count,
      sum(lsm.evidence_count)::integer as evidence_count
    from public.learner_skill_mastery lsm
    join public.classroom_members cm
      on cm.learner_id = lsm.learner_id
     and cm.classroom_id = p_classroom_id
     and cm.status::text = 'active'
    where lsm.current_judgement::text in ('not_yet','developing')
       or lsm.misconception_count > 0
    group by lsm.skill_id
    having count(distinct lsm.learner_id) >= 3
  )
  insert into public.teacher_intelligence_signals(
    classroom_id, skill_id, signal_type, title, rationale,
    next_learning_goal, recommended_action,
    confidence, evidence_sufficiency, evidence_summary,
    contradictory_evidence, status, source, source_key,
    learner_count_snapshot
  )
  select
    p_classroom_id,
    cn.skill_id,
    'class',
    'Whole-class review may be more appropriate for ' || s.name,
    cn.learner_count || ' of ' || v_active || ' active learners show a current reviewed need in this skill.',
    'Re-establish the core concept for the class, then identify learners who still require targeted support.',
    'Consider whole-class reteaching before creating multiple small groups.',
    case when cn.evidence_count >= cn.learner_count * 2 then 'high' else 'medium' end,
    'sufficient',
    jsonb_build_object(
      'learnerCount',cn.learner_count,
      'activeClassSize',v_active,
      'classShare',case when v_active > 0 then round(cn.learner_count::numeric / v_active, 3) else 0 end,
      'evidenceCount',cn.evidence_count,
      'rule','at_least_half_and_minimum_three'
    ),
    '[]'::jsonb,
    'proposed',
    'phase1b_rules_v1',
    'class-skill:' || cn.skill_id::text,
    cn.learner_count
  from class_need cn
  join public.skills s on s.id = cn.skill_id and s.active = true
  where v_active >= 3
    and cn.learner_count * 2 >= v_active;

  insert into public.teacher_intelligence_signal_learners(
    signal_id, learner_id, inclusion_reason, evidence_count,
    independent_evidence_count, assisted_evidence_count,
    misconception_count, confidence
  )
  select
    tis.id,
    lsm.learner_id,
    'Included in the class-level signal because reviewed evidence shows a current need in this skill.',
    lsm.evidence_count,
    lsm.independent_evidence_count,
    lsm.assisted_evidence_count,
    lsm.misconception_count,
    tis.confidence
  from public.teacher_intelligence_signals tis
  join public.learner_skill_mastery lsm
    on tis.source_key = 'class-skill:' || lsm.skill_id::text
  join public.classroom_members cm
    on cm.classroom_id = tis.classroom_id
   and cm.learner_id = lsm.learner_id
   and cm.status::text = 'active'
  where tis.classroom_id = p_classroom_id
    and tis.source = 'phase1b_rules_v1'
    and tis.signal_type = 'class'
    and (
      lsm.current_judgement::text in ('not_yet','developing')
      or lsm.misconception_count > 0
    )
  on conflict (signal_id, learner_id) do nothing;

  -- Change signals use the learner's own reviewed trend rather than comparison with peers.
  insert into public.teacher_intelligence_signals(
    classroom_id, skill_id, signal_type, title, rationale,
    strength_asset, next_learning_goal, recommended_action,
    confidence, evidence_sufficiency, evidence_summary,
    contradictory_evidence, status, source, source_key,
    learner_count_snapshot
  )
  select
    p_classroom_id,
    lsm.skill_id,
    'change',
    l.display_name || ' shows a declining pattern in ' || s.name,
    'The reviewed mastery trend is declining across ' || lsm.evidence_count || ' evidence items.',
    case when lsm.independent_evidence_count > 0
      then 'Earlier/current independent evidence exists and should be compared with the decline.'
      else null end,
    'Identify what changed before deciding whether reteaching, practice, or teacher follow-up is needed.',
    'Inspect recent evidence and context. Treat this as a change signal, not a behavioral or diagnostic label.',
    case when lsm.evidence_count >= 3 then 'high' else 'medium' end,
    'sufficient',
    jsonb_build_object(
      'trend',lsm.trend::text,
      'judgement',lsm.current_judgement::text,
      'evidenceCount',lsm.evidence_count,
      'independentEvidenceCount',lsm.independent_evidence_count,
      'lastEvidenceAt',lsm.last_evidence_at
    ),
    '[]'::jsonb,
    'proposed',
    'phase1b_rules_v1',
    'change:' || lsm.learner_id::text || ':' || lsm.skill_id::text,
    1
  from public.learner_skill_mastery lsm
  join public.classroom_members cm
    on cm.learner_id = lsm.learner_id
   and cm.classroom_id = p_classroom_id
   and cm.status::text = 'active'
  join public.learners l on l.id = lsm.learner_id and l.active = true
  join public.skills s on s.id = lsm.skill_id and s.active = true
  where lsm.trend::text = 'declining'
    and lsm.evidence_count >= 2;

  insert into public.teacher_intelligence_signal_learners(
    signal_id, learner_id, inclusion_reason, evidence_count,
    independent_evidence_count, assisted_evidence_count,
    misconception_count, confidence
  )
  select
    tis.id,
    lsm.learner_id,
    'Included because the learner\'s own reviewed trend is declining for this skill.',
    lsm.evidence_count,
    lsm.independent_evidence_count,
    lsm.assisted_evidence_count,
    lsm.misconception_count,
    tis.confidence
  from public.teacher_intelligence_signals tis
  join public.learner_skill_mastery lsm
    on tis.source_key = 'change:' || lsm.learner_id::text || ':' || lsm.skill_id::text
  where tis.classroom_id = p_classroom_id
    and tis.source = 'phase1b_rules_v1'
    and tis.signal_type = 'change'
  on conflict (signal_id, learner_id) do nothing;

  -- Enrichment signals detect secure strengths rather than only deficits.
  with strengths as (
    select
      lsm.skill_id,
      count(distinct lsm.learner_id)::integer as learner_count,
      sum(lsm.evidence_count)::integer as evidence_count,
      sum(lsm.independent_evidence_count)::integer as independent_count
    from public.learner_skill_mastery lsm
    join public.classroom_members cm
      on cm.learner_id = lsm.learner_id
     and cm.classroom_id = p_classroom_id
     and cm.status::text = 'active'
    where lsm.current_judgement::text in ('secure','strong')
      and lsm.confidence::text in ('medium','high')
      and lsm.independent_evidence_count >= 2
      and lsm.misconception_count = 0
    group by lsm.skill_id
  )
  insert into public.teacher_intelligence_signals(
    classroom_id, skill_id, signal_type, title, rationale,
    strength_asset, next_learning_goal, recommended_action,
    confidence, evidence_sufficiency, evidence_summary,
    contradictory_evidence, status, source, source_key,
    learner_count_snapshot
  )
  select
    p_classroom_id,
    st.skill_id,
    'enrichment',
    st.learner_count || ' learner' || case when st.learner_count = 1 then '' else 's' end ||
      ' may be ready for enrichment in ' || s.name,
    'Reviewed mastery is secure/strong with repeated independent evidence and no recorded misconceptions.',
    st.independent_count || ' independent evidence items support this strength signal.',
    'Apply ' || s.name || ' in a more complex, unfamiliar, or cross-topic task.',
    'Review the evidence and consider enrichment instead of more repetition.',
    case when st.independent_count >= st.learner_count * 3 then 'high' else 'medium' end,
    'sufficient',
    jsonb_build_object(
      'learnerCount',st.learner_count,
      'evidenceCount',st.evidence_count,
      'independentEvidenceCount',st.independent_count
    ),
    '[]'::jsonb,
    'proposed',
    'phase1b_rules_v1',
    'enrichment-skill:' || st.skill_id::text,
    st.learner_count
  from strengths st
  join public.skills s on s.id = st.skill_id and s.active = true;

  insert into public.teacher_intelligence_signal_learners(
    signal_id, learner_id, inclusion_reason, evidence_count,
    independent_evidence_count, assisted_evidence_count,
    misconception_count, confidence
  )
  select
    tis.id,
    lsm.learner_id,
    'Included because mastery is secure/strong with repeated independent evidence and no recorded misconceptions.',
    lsm.evidence_count,
    lsm.independent_evidence_count,
    lsm.assisted_evidence_count,
    lsm.misconception_count,
    tis.confidence
  from public.teacher_intelligence_signals tis
  join public.learner_skill_mastery lsm
    on tis.source_key = 'enrichment-skill:' || lsm.skill_id::text
  join public.classroom_members cm
    on cm.classroom_id = tis.classroom_id
   and cm.learner_id = lsm.learner_id
   and cm.status::text = 'active'
  where tis.classroom_id = p_classroom_id
    and tis.source = 'phase1b_rules_v1'
    and tis.signal_type = 'enrichment'
    and lsm.current_judgement::text in ('secure','strong')
    and lsm.confidence::text in ('medium','high')
    and lsm.independent_evidence_count >= 2
    and lsm.misconception_count = 0
  on conflict (signal_id, learner_id) do nothing;

  return query
  select tis.signal_type, count(*)::integer
  from public.teacher_intelligence_signals tis
  where tis.classroom_id = p_classroom_id
    and tis.source = 'phase1b_rules_v1'
    and tis.status = 'proposed'
  group by tis.signal_type
  order by tis.signal_type;
end;
$function$;

revoke all on function public.refresh_teacher_intelligence_signals(uuid) from public;
revoke all on function public.refresh_teacher_intelligence_signals(uuid) from anon;
grant execute on function public.refresh_teacher_intelligence_signals(uuid) to authenticated;

drop function if exists public.get_teacher_intelligence_signals(uuid);

create function public.get_teacher_intelligence_signals(
  p_classroom_id uuid
)
returns table(
  signal_id uuid,
  signal_type text,
  skill_id uuid,
  skill_code text,
  skill_name text,
  subject text,
  title text,
  rationale text,
  strength_asset text,
  next_learning_goal text,
  recommended_action text,
  confidence text,
  evidence_sufficiency text,
  evidence_summary jsonb,
  contradictory_evidence jsonb,
  signal_status text,
  source text,
  source_key text,
  detected_at timestamptz,
  learner_count integer,
  learner_ids uuid[],
  learner_names text[]
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in.';
  end if;

  if not public.teacher_owns_classroom(p_classroom_id) then
    raise exception 'You are not authorized to view teacher intelligence for this classroom.';
  end if;

  return query
  select
    tis.id,
    tis.signal_type,
    s.id,
    s.skill_code,
    s.name,
    s.subject,
    tis.title,
    tis.rationale,
    tis.strength_asset,
    tis.next_learning_goal,
    tis.recommended_action,
    tis.confidence,
    tis.evidence_sufficiency,
    tis.evidence_summary,
    tis.contradictory_evidence,
    tis.status,
    tis.source,
    tis.source_key,
    tis.detected_at,
    count(tisl.learner_id)::integer,
    coalesce(array_agg(tisl.learner_id order by l.display_name) filter (where tisl.learner_id is not null), '{}'::uuid[]),
    coalesce(array_agg(l.display_name order by l.display_name) filter (where l.display_name is not null), '{}'::text[])
  from public.teacher_intelligence_signals tis
  left join public.skills s on s.id = tis.skill_id
  left join public.teacher_intelligence_signal_learners tisl on tisl.signal_id = tis.id
  left join public.learners l on l.id = tisl.learner_id
  where tis.classroom_id = p_classroom_id
  group by
    tis.id,tis.signal_type,s.id,s.skill_code,s.name,s.subject,
    tis.title,tis.rationale,tis.strength_asset,tis.next_learning_goal,
    tis.recommended_action,tis.confidence,tis.evidence_sufficiency,
    tis.evidence_summary,tis.contradictory_evidence,tis.status,
    tis.source,tis.source_key,tis.detected_at
  order by
    case tis.signal_type
      when 'class' then 1
      when 'group' then 2
      when 'change' then 3
      when 'individual' then 4
      when 'enrichment' then 5
      else 6
    end,
    case tis.status
      when 'proposed' then 1
      when 'deferred' then 2
      when 'approved' then 3
      when 'resolved' then 4
      else 5
    end,
    tis.detected_at desc;
end;
$function$;

revoke all on function public.get_teacher_intelligence_signals(uuid) from public;
revoke all on function public.get_teacher_intelligence_signals(uuid) from anon;
grant execute on function public.get_teacher_intelligence_signals(uuid) to authenticated;

comment on function public.refresh_teacher_intelligence_signals(uuid) is
  'Phase 1B deterministic teacher-owned refresh for explainable individual/group/class/change/enrichment signals. Does not activate interventions.';
