-- LMU Phase 1I: focused CAPS Mathematics Grades 4-6 pilot skill map
-- and observable misconception taxonomy.
-- Scope is intentionally limited to common fractions and directly related
-- Grade 6 fraction/decimal/percentage equivalence.

create table if not exists public.caps_math_pilot_skill_map (
  skill_id uuid primary key references public.skills(id) on delete cascade,
  pilot_code text not null,
  caps_grade_min smallint not null check (caps_grade_min between 4 and 6),
  caps_grade_max smallint not null check (caps_grade_max between 4 and 6),
  stage_code text not null,
  caps_topic text not null default '1.2 Common Fractions',
  caps_expectation text not null,
  pilot_evidence_focus text not null,
  source_reference text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (pilot_code, stage_code),
  check (caps_grade_min <= caps_grade_max)
);

create table if not exists public.caps_math_pilot_misconceptions (
  code text primary key,
  short_label text not null,
  observable_pattern text not null,
  teacher_check text not null,
  research_basis text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.caps_math_pilot_skill_misconceptions (
  skill_id uuid not null references public.skills(id) on delete cascade,
  misconception_code text not null references public.caps_math_pilot_misconceptions(code) on delete restrict,
  primary key (skill_id, misconception_code)
);

alter table public.caps_math_pilot_skill_map enable row level security;
alter table public.caps_math_pilot_misconceptions enable row level security;
alter table public.caps_math_pilot_skill_misconceptions enable row level security;
revoke all on public.caps_math_pilot_skill_map from anon, authenticated;
revoke all on public.caps_math_pilot_misconceptions from anon, authenticated;
revoke all on public.caps_math_pilot_skill_misconceptions from anon, authenticated;

insert into public.skills(skill_code,curriculum_code,subject,stage_code,name,description,active)
values
('CAPS-M4-CF-MAGNITUDE-DB810','CAPS','Mathematics','DB810',
 'Grade 4 - Compare and order common fractions',
 'Pilot focus: compare and order common fractions with denominators 2 to 8 using magnitude, diagrams and number-line reasoning.',true),
('CAPS-M4-CF-EQUIV-DB810','CAPS','Mathematics','DB810',
 'Grade 4 - Equivalent common fractions',
 'Pilot focus: recognise equivalent common fractions where one denominator is a multiple of another, supported by diagrams or context.',true),
('CAPS-M45-CF-DIVSHARE-DB810','CAPS','Mathematics','DB810',
 'Grades 4-5 - Fractions as division and equal sharing',
 'Pilot focus: connect fractions with division, grouping and equal sharing in contextual problems.',true),
('CAPS-M45-CF-DIVSHARE-CA1113','CAPS','Mathematics','CA1113',
 'Grades 4-5 - Fractions as division and equal sharing',
 'Pilot focus: connect fractions with division, grouping and equal sharing in contextual problems.',true),
('CAPS-M5-CF-SAMEDEN-DB810','CAPS','Mathematics','DB810',
 'Grade 5 - Add and subtract common fractions',
 'Pilot focus: add and subtract common fractions with the same denominator and reason about the fractional unit.',true),
('CAPS-M5-CF-SAMEDEN-CA1113','CAPS','Mathematics','CA1113',
 'Grade 5 - Add and subtract common fractions',
 'Pilot focus: add and subtract common fractions with the same denominator and reason about the fractional unit.',true),
('CAPS-M56-CF-OFWHOLE-DB810','CAPS','Mathematics','DB810',
 'Grades 5-6 - Fractions of whole numbers',
 'Pilot focus: determine fractions of whole numbers through grouping, sharing and multiplicative reasoning.',true),
('CAPS-M56-CF-OFWHOLE-CA1113','CAPS','Mathematics','CA1113',
 'Grades 5-6 - Fractions of whole numbers',
 'Pilot focus: determine fractions of whole numbers through grouping, sharing and multiplicative reasoning.',true),
('CAPS-M6-CF-DENMULT-CA1113','CAPS','Mathematics','CA1113',
 'Grade 6 - Add and subtract related-denominator fractions',
 'Pilot focus: add and subtract common fractions when one denominator is a multiple of the other.',true),
('CAPS-M6-CF-FDP-EQUIV-CA1113','CAPS','Mathematics','CA1113',
 'Grade 6 - Fraction, decimal and percentage equivalence',
 'Pilot focus: recognise equivalent common-fraction, decimal-fraction and percentage forms and use percentages of whole numbers.',true)
on conflict (skill_code) do update set
  curriculum_code=excluded.curriculum_code,
  subject=excluded.subject,
  stage_code=excluded.stage_code,
  name=excluded.name,
  description=excluded.description,
  active=true;

insert into public.caps_math_pilot_skill_map(
  skill_id,pilot_code,caps_grade_min,caps_grade_max,stage_code,
  caps_expectation,pilot_evidence_focus,source_reference,active
)
select s.id,v.pilot_code,v.grade_min,v.grade_max,s.stage_code,
       v.expectation,v.evidence_focus,
       'DBE CAPS Mathematics Grades 4-6 - Numbers, Operations and Relationships - Topic 1.2 Common Fractions',
       true
from (
  values
  ('CAPS-M4-CF-MAGNITUDE-DB810','M4-CF-MAGNITUDE',4::smallint,4::smallint,
   'Compare and order common fractions with different denominators from 2 to 8 and interpret diagrammatic forms.',
   'Explain which fraction is larger using a diagram, benchmark or number-line argument.'),
  ('CAPS-M4-CF-EQUIV-DB810','M4-CF-EQUIV',4::smallint,4::smallint,
   'Recognise and use equivalent forms of common fractions when one denominator is a multiple of another.',
   'Show equivalence using equal partitions, fraction strips or an explained scaling relationship.'),
  ('CAPS-M45-CF-DIVSHARE-DB810','M45-CF-DIVSHARE',4::smallint,5::smallint,
   'Recognise the equivalence of division and fractions and solve grouping or equal-sharing fraction problems.',
   'Represent equal sharing and connect the result to a fraction of the whole.'),
  ('CAPS-M45-CF-DIVSHARE-CA1113','M45-CF-DIVSHARE',4::smallint,5::smallint,
   'Recognise the equivalence of division and fractions and solve grouping or equal-sharing fraction problems.',
   'Represent equal sharing and connect the result to a fraction of the whole.'),
  ('CAPS-M5-CF-SAMEDEN-DB810','M5-CF-SAMEDEN',5::smallint,5::smallint,
   'Add and subtract common fractions with the same denominator.',
   'Keep the fractional unit fixed and explain addition or subtraction in terms of counts of that unit.'),
  ('CAPS-M5-CF-SAMEDEN-CA1113','M5-CF-SAMEDEN',5::smallint,5::smallint,
   'Add and subtract common fractions with the same denominator.',
   'Keep the fractional unit fixed and explain addition or subtraction in terms of counts of that unit.'),
  ('CAPS-M56-CF-OFWHOLE-DB810','M56-CF-OFWHOLE',5::smallint,6::smallint,
   'Find fractions of whole numbers, including Grade 5 cases that result in whole numbers.',
   'Use grouping, sharing or multiplication/division relationships to justify a fraction of a quantity.'),
  ('CAPS-M56-CF-OFWHOLE-CA1113','M56-CF-OFWHOLE',5::smallint,6::smallint,
   'Find fractions of whole numbers, including Grade 5 cases that result in whole numbers.',
   'Use grouping, sharing or multiplication/division relationships to justify a fraction of a quantity.'),
  ('CAPS-M6-CF-DENMULT-CA1113','M6-CF-DENMULT',6::smallint,6::smallint,
   'Add and subtract common fractions when one denominator is a multiple of the other.',
   'Create equivalent units before combining quantities and explain why the numerator must scale with the denominator.'),
  ('CAPS-M6-CF-FDP-EQUIV-CA1113','M6-CF-FDP-EQUIV',6::smallint,6::smallint,
   'Recognise equivalence among common fractions, decimal fractions and percentages and find percentages of whole numbers.',
   'Translate among fraction, decimal and percentage forms and justify that the represented quantity is unchanged.')
) as v(skill_code,pilot_code,grade_min,grade_max,expectation,evidence_focus)
join public.skills s on s.skill_code=v.skill_code
on conflict (skill_id) do update set
  pilot_code=excluded.pilot_code,
  caps_grade_min=excluded.caps_grade_min,
  caps_grade_max=excluded.caps_grade_max,
  stage_code=excluded.stage_code,
  caps_expectation=excluded.caps_expectation,
  pilot_evidence_focus=excluded.pilot_evidence_focus,
  source_reference=excluded.source_reference,
  active=true;

insert into public.caps_math_pilot_misconceptions(
  code,short_label,observable_pattern,teacher_check,research_basis,active
)
values
('F-WHOLE-NUMBER-MAGNITUDE','Whole-number comparison applied to fractions',
 'The learner compares numerator and denominator as separate whole numbers instead of comparing the magnitude of the fractions.',
 'Ask for a diagram or number-line placement and a verbal comparison before deciding whether the pattern persists.',
 'Fraction whole-number bias is well documented; use this only as an observable response pattern, never as a learner label.',true),
('F-EQUIV-ONE-SIDED','Equivalent fraction scaling is one-sided',
 'The learner changes only the numerator or only the denominator when claiming that two fractions are equivalent.',
 'Ask the learner to build both fractions with equal-sized wholes and explain what changed in both parts of the notation.',
 'Research on fraction equivalence and whole-number bias supports checking proportional change in numerator and denominator.',true),
('F-PARTITION-UNEQUAL','Fractional parts are not treated as equal shares',
 'The learner treats unequal partitions or unequal groups as interchangeable fractional parts of one whole.',
 'Use a concrete or diagrammatic whole and ask whether each named part has equal size or equal share.',
 'CAPS teaching guidance emphasizes grouping, sharing, apparatus and diagrams when developing fraction meaning.',true),
('F-DIVISION-DISCONNECT','Fraction and equal sharing are disconnected',
 'The learner can perform a division or sharing step but does not connect the result to the corresponding fraction of the whole.',
 'Ask the learner to represent the same situation as equal sharing, division notation and a fraction.',
 'CAPS explicitly links grouping, equal sharing, division and fractions in Grades 4-5.',true),
('F-SAME-DENOM-UNIT-CHANGE','Denominator is changed when adding same-denominator fractions',
 'The learner changes the denominator when adding or subtracting fractions that already have the same fractional unit.',
 'Ask what one denominator unit represents, then count how many of that unchanged unit remain after the operation.',
 'A common whole-number transfer error is to operate independently on numerators and denominators.',true),
('F-FRACTION-OF-WHOLE-REVERSAL','Fraction-of-whole operation is not connected to equal groups',
 'The learner applies numerator and denominator operations without first partitioning the whole quantity into equal groups.',
 'Ask the learner to partition the whole into denominator-sized groups, then select the numerator number of groups.',
 'CAPS recommends developing fractions of whole numbers through grouping, sharing, drawings and the division relationship.',true),
('F-COMMON-DENOM-INCOMPLETE','Related denominators are converted without preserving value',
 'The learner changes a denominator to create common units but does not scale the numerator to preserve the fraction value.',
 'Ask the learner to verify each converted fraction with an equivalent-fraction model before combining the quantities.',
 'Grade 6 CAPS requires addition and subtraction where one denominator is a multiple of the other; equivalence is prerequisite evidence.',true),
('F-FDP-SCALE-CONVERSION','Fraction, decimal and percentage scale is mismatched',
 'The learner converts among fraction, decimal and percentage forms but the new representation does not preserve the same quantity.',
 'Ask the learner to locate both forms on a 0-to-1 scale or compare them with a hundred-grid representation.',
 'Grade 6 CAPS requires recognition of equivalent common-fraction, decimal-fraction and percentage forms.',true)
on conflict (code) do update set
  short_label=excluded.short_label,
  observable_pattern=excluded.observable_pattern,
  teacher_check=excluded.teacher_check,
  research_basis=excluded.research_basis,
  active=true;

insert into public.caps_math_pilot_skill_misconceptions(skill_id,misconception_code)
select sm.skill_id,m.code
from public.caps_math_pilot_skill_map sm
join public.caps_math_pilot_misconceptions m on (
  (sm.pilot_code='M4-CF-MAGNITUDE' and m.code in ('F-WHOLE-NUMBER-MAGNITUDE','F-PARTITION-UNEQUAL'))
  or (sm.pilot_code='M4-CF-EQUIV' and m.code in ('F-WHOLE-NUMBER-MAGNITUDE','F-EQUIV-ONE-SIDED'))
  or (sm.pilot_code='M45-CF-DIVSHARE' and m.code in ('F-PARTITION-UNEQUAL','F-DIVISION-DISCONNECT'))
  or (sm.pilot_code='M5-CF-SAMEDEN' and m.code in ('F-SAME-DENOM-UNIT-CHANGE','F-WHOLE-NUMBER-MAGNITUDE'))
  or (sm.pilot_code='M56-CF-OFWHOLE' and m.code in ('F-FRACTION-OF-WHOLE-REVERSAL','F-DIVISION-DISCONNECT'))
  or (sm.pilot_code='M6-CF-DENMULT' and m.code in ('F-COMMON-DENOM-INCOMPLETE','F-EQUIV-ONE-SIDED'))
  or (sm.pilot_code='M6-CF-FDP-EQUIV' and m.code in ('F-FDP-SCALE-CONVERSION','F-WHOLE-NUMBER-MAGNITUDE'))
)
where sm.active=true and m.active=true
on conflict do nothing;

alter table public.submission_reviews
  add column if not exists misconception_code text references public.caps_math_pilot_misconceptions(code) on delete set null,
  add column if not exists misconception_note text;

alter table public.mastery_evidence
  add column if not exists misconception_code text references public.caps_math_pilot_misconceptions(code) on delete set null,
  add column if not exists misconception_note text;

create index if not exists submission_reviews_misconception_code_idx
  on public.submission_reviews(misconception_code) where misconception_code is not null;
create index if not exists mastery_evidence_misconception_code_idx
  on public.mastery_evidence(misconception_code) where misconception_code is not null;

create or replace function public.get_teacher_caps_math_pilot_skills(p_classroom_id uuid)
returns table(
  skill_id uuid,
  skill_code text,
  pilot_code text,
  caps_grade_min smallint,
  caps_grade_max smallint,
  stage_code text,
  skill_name text,
  caps_expectation text,
  pilot_evidence_focus text,
  source_reference text
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;
  if not public.teacher_owns_classroom(p_classroom_id) then raise exception 'Not authorized.'; end if;

  return query
  select s.id,s.skill_code,sm.pilot_code,sm.caps_grade_min,sm.caps_grade_max,
         s.stage_code,s.name,sm.caps_expectation,sm.pilot_evidence_focus,sm.source_reference
  from public.caps_math_pilot_skill_map sm
  join public.skills s on s.id=sm.skill_id
  join public.classrooms c on c.id=p_classroom_id
  where sm.active=true and s.active=true
    and c.curriculum_code='CAPS'
    and s.curriculum_code=c.curriculum_code
    and s.stage_code in (
      select distinct l.stage_code
      from public.classroom_members cm
      join public.learners l on l.id=cm.learner_id
      where cm.classroom_id=p_classroom_id
        and cm.status::text='active'
        and l.active=true
    )
  order by sm.caps_grade_min,sm.pilot_code,s.stage_code;
end $$;

revoke all on function public.get_teacher_caps_math_pilot_skills(uuid) from public,anon;
grant execute on function public.get_teacher_caps_math_pilot_skills(uuid) to authenticated;

create or replace function public.get_pilot_misconceptions_for_submission(p_submission_id uuid)
returns table(
  code text,
  short_label text,
  observable_pattern text,
  teacher_check text
)
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_learning_item_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;

  select ls.learning_item_id into v_learning_item_id
  from public.learner_submissions ls
  join public.learning_items li on li.id=ls.learning_item_id
  where ls.id=p_submission_id
    and li.teacher_profile_id=(select auth.uid());

  if v_learning_item_id is null then raise exception 'Not authorized.'; end if;

  return query
  select distinct m.code,m.short_label,m.observable_pattern,m.teacher_check
  from public.learning_item_skills lis
  join public.caps_math_pilot_skill_misconceptions sm on sm.skill_id=lis.skill_id
  join public.caps_math_pilot_misconceptions m on m.code=sm.misconception_code
  where lis.learning_item_id=v_learning_item_id
    and m.active=true
  order by m.short_label,m.code;
end $$;

revoke all on function public.get_pilot_misconceptions_for_submission(uuid) from public,anon;
grant execute on function public.get_pilot_misconceptions_for_submission(uuid) to authenticated;

create or replace function public.review_learner_submission_v2(
  p_submission_id uuid,
  p_mastery_judgement public.mastery_judgement,
  p_misconception_code text,
  p_misconception_note text,
  p_teacher_feedback text,
  p_recommended_next_step text
)
returns uuid
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_review_id uuid;
  v_assistance_level smallint;
  v_submitted_actor text;
  v_learning_item_id uuid;
  v_learner_id uuid;
  v_submission_status public.submission_status;
  v_canonical_misconception text;
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;

  select ls.assistance_level,ls.submitted_actor,ls.learning_item_id,ls.learner_id,ls.status
  into v_assistance_level,v_submitted_actor,v_learning_item_id,v_learner_id,v_submission_status
  from public.learner_submissions ls
  join public.learning_items li on li.id=ls.learning_item_id
  where ls.id=p_submission_id
    and li.teacher_profile_id=(select auth.uid());

  if not found then raise exception 'You are not authorized to review this submission.'; end if;
  if v_submission_status <> 'submitted'::public.submission_status then
    raise exception 'Only submitted work can be reviewed.';
  end if;

  if exists (
    select 1 from public.learner_evidence_items e
    where e.submission_id=p_submission_id
      and e.status='pending_parent_approval'::public.evidence_status
  ) then
    raise exception 'Guardian evidence approval is still pending. Review cannot be completed yet.';
  end if;

  if nullif(trim(coalesce(p_misconception_code,'')),'') is not null then
    select m.observable_pattern into v_canonical_misconception
    from public.caps_math_pilot_misconceptions m
    where m.code=p_misconception_code and m.active=true
      and exists (
        select 1
        from public.learning_item_skills lis
        join public.caps_math_pilot_skill_misconceptions sm
          on sm.skill_id=lis.skill_id and sm.misconception_code=m.code
        where lis.learning_item_id=v_learning_item_id
      );
    if v_canonical_misconception is null then
      raise exception 'Selected misconception is not valid for the mapped pilot skill.';
    end if;
  else
    v_canonical_misconception:=nullif(trim(coalesce(p_misconception_note,'')),'');
  end if;

  insert into public.submission_reviews(
    submission_id,teacher_profile_id,mastery_judgement,misconception,
    misconception_code,misconception_note,
    teacher_feedback,recommended_next_step,independent_evidence
  )
  values(
    p_submission_id,(select auth.uid()),p_mastery_judgement,v_canonical_misconception,
    nullif(trim(coalesce(p_misconception_code,'')),''),
    nullif(trim(coalesce(p_misconception_note,'')),''),
    nullif(trim(coalesce(p_teacher_feedback,'')),''),
    nullif(trim(coalesce(p_recommended_next_step,'')),''),
    (v_assistance_level=0 and v_submitted_actor='learner')
  )
  on conflict(submission_id) do update set
    mastery_judgement=excluded.mastery_judgement,
    misconception=excluded.misconception,
    misconception_code=excluded.misconception_code,
    misconception_note=excluded.misconception_note,
    teacher_feedback=excluded.teacher_feedback,
    recommended_next_step=excluded.recommended_next_step,
    independent_evidence=excluded.independent_evidence,
    teacher_profile_id=(select auth.uid()),
    updated_at=now()
  returning id into v_review_id;

  update public.learning_item_recipients lir
  set status='reviewed'::public.recipient_learning_status
  where lir.learning_item_id=v_learning_item_id
    and lir.learner_id=v_learner_id
    and lir.status='submitted'::public.recipient_learning_status;

  if not found then raise exception 'Submission recipient is not in submitted state.'; end if;
  return v_review_id;
end $$;

revoke all on function public.review_learner_submission_v2(uuid,public.mastery_judgement,text,text,text,text)
  from public,anon;
grant execute on function public.review_learner_submission_v2(uuid,public.mastery_judgement,text,text,text,text)
  to authenticated;

create or replace function public.review_learner_submission(
  p_submission_id uuid,
  p_mastery_judgement public.mastery_judgement,
  p_misconception text,
  p_teacher_feedback text,
  p_recommended_next_step text
)
returns uuid
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_review_id uuid;
  v_assistance_level smallint;
  v_submitted_actor text;
  v_learning_item_id uuid;
  v_learner_id uuid;
  v_submission_status public.submission_status;
begin
  if (select auth.uid()) is null then raise exception 'You must be signed in.'; end if;

  select ls.assistance_level,ls.submitted_actor,ls.learning_item_id,ls.learner_id,ls.status
  into v_assistance_level,v_submitted_actor,v_learning_item_id,v_learner_id,v_submission_status
  from public.learner_submissions ls
  join public.learning_items li on li.id=ls.learning_item_id
  where ls.id=p_submission_id
    and li.teacher_profile_id=(select auth.uid());

  if not found then raise exception 'You are not authorized to review this submission.'; end if;
  if v_submission_status <> 'submitted'::public.submission_status then
    raise exception 'Only submitted work can be reviewed.';
  end if;

  if exists (
    select 1 from public.learner_evidence_items e
    where e.submission_id=p_submission_id
      and e.status='pending_parent_approval'::public.evidence_status
  ) then
    raise exception 'Guardian evidence approval is still pending. Review cannot be completed yet.';
  end if;

  insert into public.submission_reviews(
    submission_id,teacher_profile_id,mastery_judgement,misconception,
    misconception_code,misconception_note,
    teacher_feedback,recommended_next_step,independent_evidence
  )
  values(
    p_submission_id,(select auth.uid()),p_mastery_judgement,
    nullif(trim(coalesce(p_misconception,'')),''),
    null,null,
    nullif(trim(coalesce(p_teacher_feedback,'')),''),
    nullif(trim(coalesce(p_recommended_next_step,'')),''),
    (v_assistance_level=0 and v_submitted_actor='learner')
  )
  on conflict(submission_id) do update set
    mastery_judgement=excluded.mastery_judgement,
    misconception=excluded.misconception,
    misconception_code=null,
    misconception_note=null,
    teacher_feedback=excluded.teacher_feedback,
    recommended_next_step=excluded.recommended_next_step,
    independent_evidence=excluded.independent_evidence,
    teacher_profile_id=(select auth.uid()),
    updated_at=now()
  returning id into v_review_id;

  update public.learning_item_recipients lir
  set status='reviewed'::public.recipient_learning_status
  where lir.learning_item_id=v_learning_item_id
    and lir.learner_id=v_learner_id
    and lir.status='submitted'::public.recipient_learning_status;

  if not found then raise exception 'Submission recipient is not in submitted state.'; end if;
  return v_review_id;
end $$;

create or replace function public.sync_review_to_mastery(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_submission_id uuid;
  v_learner_id uuid;
  v_learning_item_id uuid;
  v_assistance_level smallint;
  v_submitted_at timestamptz;
  v_judgement public.mastery_judgement;
  v_independent boolean;
  v_misconception text;
  v_misconception_code text;
  v_misconception_note text;
  v_skill record;
begin
  select ls.id,ls.learner_id,ls.learning_item_id,ls.assistance_level,ls.submitted_at,
         sr.mastery_judgement,sr.independent_evidence,sr.misconception,
         sr.misconception_code,sr.misconception_note
  into v_submission_id,v_learner_id,v_learning_item_id,v_assistance_level,v_submitted_at,
       v_judgement,v_independent,v_misconception,v_misconception_code,v_misconception_note
  from public.submission_reviews sr
  join public.learner_submissions ls on ls.id=sr.submission_id
  where sr.id=p_review_id;

  if not found then return; end if;

  for v_skill in
    select lis.skill_id
    from public.learning_item_skills lis
    where lis.learning_item_id=v_learning_item_id
  loop
    insert into public.mastery_evidence(
      learner_id,skill_id,learning_item_id,submission_id,review_id,judgement,
      assistance_level,independent_evidence,misconception,misconception_code,
      misconception_note,observed_at
    )
    values(
      v_learner_id,v_skill.skill_id,v_learning_item_id,v_submission_id,p_review_id,
      v_judgement,v_assistance_level,v_independent,v_misconception,
      v_misconception_code,v_misconception_note,coalesce(v_submitted_at,now())
    )
    on conflict(review_id,skill_id) do update set
      judgement=excluded.judgement,
      assistance_level=excluded.assistance_level,
      independent_evidence=excluded.independent_evidence,
      misconception=excluded.misconception,
      misconception_code=excluded.misconception_code,
      misconception_note=excluded.misconception_note,
      observed_at=excluded.observed_at;

    perform public.refresh_learner_skill_mastery(v_learner_id,v_skill.skill_id);
  end loop;
end $$;

comment on table public.caps_math_pilot_skill_map is
  'Phase 1I focused CAPS Mathematics Grades 4-6 fraction pilot map. Not a full CAPS curriculum.';
comment on table public.caps_math_pilot_misconceptions is
  'Observable response patterns for teacher review. Codes are not diagnoses or permanent learner labels.';
