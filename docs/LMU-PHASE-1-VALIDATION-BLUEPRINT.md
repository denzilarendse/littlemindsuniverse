# LittleMindsUniverse Phase 1 Validation Blueprint

Status: Draft v1 for validation freeze
Date: 2026-10-08
Primary objective: validate LMU as a teacher-amplification system before broad product expansion.

## 1. North Star

LittleMindsUniverse exists to multiply the capability of a teacher by helping the teacher see, understand, and support every learner with far more individual attention than classroom time normally allows.

Milo is not the teacher. Milo is the teacher's evidence-aware assistant and the learner's personal coach.

The operating loop is:

Learner work -> evidence -> pattern detection -> teacher insight -> proposed intervention -> teacher approval -> Milo support -> new evidence -> teacher review -> continue, adapt, exit, or enrich.

The product must optimize for two outcomes simultaneously:

1. learners understand, transfer, and retain more;
2. teachers can identify and address needs earlier without an unsustainable increase in workload.

## 2. Phase 1 hypotheses

### H1: Detection
Milo can identify useful skill-level misconceptions, learning gaps, emerging strengths, and meaningful changes from learner evidence with sufficient precision to help a teacher.

### H2: Intervention
Teacher-approved Milo interventions can improve learner performance on the targeted skill.

### H3: Transfer
Improvement is not limited to the practiced item; learners can solve a different problem requiring the same underlying understanding.

### H4: Retention
A meaningful share of learners retain the improvement at a delayed check rather than only immediately after tutoring.

### H5: Teacher amplification
LMU reduces the effort required to identify, group, plan for, and monitor differentiated support relative to the teacher doing the same work manually.

### H6: Trust and adoption
Teachers regard Milo's findings as interpretable, controllable, safe, and useful enough to continue using LMU voluntarily.

### H7: Earlier intervention
LMU can surface some learning needs before the teacher would otherwise have identified them in normal classroom workflow.

## 3. Active ingredients that must remain stable during the pilot

These are the components that define the intervention. Changes to them during the pilot must be logged.

- teacher remains the academic authority;
- learner evidence is linked to explicit curriculum skills;
- assistance level is recorded;
- independent evidence is distinguished from assisted evidence;
- Milo proposes, but the teacher approves or rejects consequential interventions;
- misconceptions are expressed as observable learning patterns rather than permanent learner labels;
- temporary groups are skill-specific and may overlap;
- intervention includes targeted teaching, learner retry, transfer check, and delayed retention check;
- mastery is based on repeated reviewed evidence, not conversation volume or one correct answer;
- strengths and enrichment opportunities are detected as well as weaknesses;
- high-stakes or standardized assessment is not silently personalized;
- behavioral signals remain observations requiring human interpretation, not diagnoses.

## 4. Recommended first pilot

### Scope

Start with one teacher-led cohort.

Recommended initial domain:
- curriculum: CAPS;
- subject: Mathematics;
- cohort: one Grade 4-6 class or tutoring group;
- preferred size: 15-30 learners for the first operational pilot;
- duration: 90 days;
- first target concepts: a small number of explicitly mapped skills such as fractions.

A 50-60 learner classroom is the strategic target, but the first pilot should validate the mechanism with enough control to understand failure modes.

### Participants

- 1 primary teacher or tutor;
- 15-30 learners in the initial operational cohort;
- parents/guardians where required by policy and consent;
- optional second teacher/cohort during Days 61-90 for replication.

### Baseline

Before active intervention:
- collect a short skill-aligned baseline;
- record teacher judgment of which learners need support;
- record current grouping/intervention process;
- estimate teacher time spent identifying gaps, differentiating tasks, reviewing work, and following up;
- capture ordinary learner work before Milo-driven recommendations.

## 5. Teacher Intelligence Dashboard requirements

The dashboard must reduce teacher cognitive load rather than expose raw analytics.

### Primary hierarchy

1. Needs attention
2. Why
3. Evidence
4. Recommended next goal/action
5. Teacher decision
6. Intervention progress
7. Outcome

### Class-level summary

For each classroom show:
- active learners;
- skills currently needing attention;
- number of learners affected per skill;
- common misconception clusters;
- enrichment candidates;
- meaningful change signals;
- proposed interventions awaiting decision;
- active intervention groups;
- groups ready for review or closure;
- unresolved teacher-review items.

### Signal card

Every Milo signal should include:
- skill;
- learner or learner cluster;
- signal type: individual, group, class, change, enrichment;
- evidence count;
- independent vs assisted evidence;
- recency;
- current mastery judgment;
- trend;
- misconception pattern;
- learner strength/asset that can be used;
- next learning goal;
- recommended action;
- confidence;
- contradictory evidence if present;
- "insufficient evidence" where appropriate.

### Teacher actions

Teacher can:
- approve;
- reject;
- defer;
- inspect evidence;
- add/remove learners;
- modify group name/objective;
- adjust intervention duration or target;
- request another diagnostic;
- close/dissolve an intervention;
- mark "Milo finding incorrect" for validation analysis.

## 6. Misconception-detection model

Phase 1 should use an explainable rules-and-evidence model before adding opaque prediction.

### Required evidence dimensions

A misconception candidate must be tied to:
- learner_id;
- skill_id;
- misconception taxonomy/code where available;
- source evidence;
- timestamp;
- assessment/task context;
- assistance level;
- independence;
- repeated occurrence count;
- recent trend;
- teacher-reviewed status where available.

### Signal levels

#### Individual signal
One learner repeatedly demonstrates the same skill-level misconception.

#### Group signal
Multiple learners in the same parent classroom demonstrate materially similar evidence for the same skill or misconception.

#### Class signal
A large portion of the class struggles on the same objective, suggesting whole-class reteaching may be more appropriate than a small intervention group.

#### Change signal
A meaningful decline or departure from the learner's own prior pattern.

#### Enrichment signal
Repeated independent, transferable, high-confidence evidence indicates the learner may benefit from extension rather than repetition.

### Confidence rules

Phase 1 confidence should be evidence-derived and interpretable.

Low:
- one item or mostly assisted evidence.

Medium:
- repeated evidence across at least two observations or contexts.

High:
- repeated evidence including independent attempts and consistent pattern across contexts.

A high confidence label must never mean "diagnosis." It means confidence in the observed learning pattern.

## 7. Intervention-group rules

### Principles

- temporary;
- teacher-approved;
- skill-specific;
- linked to a normal parent classroom;
- overlapping membership allowed;
- no permanent "weak learner" labels;
- one learner may be in several intervention or enrichment groups simultaneously.

### Group creation proposal

Milo should propose:
- group type: intervention, reinforcement, or enrichment;
- target skill;
- misconception/goal;
- proposed learners;
- evidence for each learner;
- suggested learning sequence;
- start date;
- review date;
- transfer task;
- exit criteria.

### Teacher approval

No consequential group should activate until teacher approval in Phase 1.

Teacher can edit membership before approval.

### Exit rules

Milo can recommend exit only after:
- targeted task success;
- at least one independent attempt;
- a different transfer task;
- no contradictory recent evidence;
- delayed retention check where the intervention is long enough to permit it.

Teacher confirms exit.

### Group dissolution

When all active members meet exit criteria or the teacher closes the group:
- group becomes inactive;
- outcome is recorded;
- learners remain in the parent classroom;
- historical intervention evidence remains auditable.

## 8. Evidence model

Not all evidence should carry equal weight.

### Evidence classes

1. Teacher-reviewed assignment evidence
2. Independent learner attempt
3. Assisted learner attempt
4. Milo formative diagnostic
5. Transfer task
6. Delayed retention check
7. Project/performance evidence
8. Approved multimedia evidence
9. Teacher observation
10. Learner reflection/self-explanation

### Required provenance

Each evidence record should identify:
- learner;
- skill;
- source;
- learning item/session;
- assistance level;
- independence;
- timestamp;
- reviewer where applicable;
- misconception tags;
- result/judgment;
- intervention/group context where applicable.

### Mastery interpretation

Mastery must not be derived from one correct answer.

Phase 1 mastery evidence should consider:
- accuracy;
- independence;
- transfer;
- retention;
- consistency;
- misconception recurrence;
- teacher review.

Milo may recommend that evidence suggests a skill is secure, but the teacher retains academic authority for consequential mastery decisions.

## 9. Behavioral and wellbeing signals

LMU may identify observable changes that could warrant teacher attention, but must not diagnose medical, psychological, disciplinary, or moral conditions from learner work.

Allowed examples:
- repeated non-completion;
- abrupt drop in participation;
- substantial change in response length/quality;
- repeated concerning language in submitted work;
- unusual change from the learner's own historical pattern.

Do not label:
- lazy;
- undisciplined;
- ADHD;
- depressed;
- aggressive;
- dishonest;
- low ability;
- similar inferred traits or diagnoses.

Teacher-facing wording should be:
"Pattern may warrant teacher attention" plus the evidence.

Escalation to safeguarding, school support, SBST/DBST, counselling, or other professional processes remains a human decision governed by applicable school policy.

## 10. Pilot success metrics

These are pilot decision metrics, not claims of efficacy.

### A. Detection quality
Measure:
- teacher agreement with Milo findings;
- false-positive rate;
- useful vs irrelevant recommendations;
- time from evidence to teacher awareness.

Operational target for Phase 1:
- a clear majority of teacher-reviewed signals are rated useful/accurate;
- no recurring high-severity false-alert pattern;
- teacher can understand why each signal was raised.

Because teacher sample size will initially be small, report raw counts and qualitative judgments, not misleading precision percentages.

### B. Learning outcome
For each intervention:
- baseline;
- immediate retry;
- transfer task;
- delayed retention task.

Report:
- learners improving;
- learners demonstrating independent transfer;
- learners retaining at delayed check;
- learners needing a changed intervention.

Do not claim causal impact from the first small pilot.

### C. Teacher workload
Measure:
- time to identify learners needing support;
- time to form groups;
- time to prepare targeted tasks;
- time to review outcomes;
- number of actionable learners handled per week.

Success condition:
- teacher reports the workflow is implementable and does not create a net burden;
- evidence suggests LMU reduces at least one major differentiation task meaningfully.

### D. Adoption/trust
Measure:
- teacher use of recommendations;
- approval/rejection reasons;
- teacher confidence in evidence;
- willingness to continue;
- willingness to recommend to another teacher;
- learner completion and return patterns.

### E. Fidelity
Track whether the core loop actually occurred:
detect -> approve -> intervene -> retry -> transfer -> review.

### F. Cost
Track:
- AI cost per Milo session;
- AI cost per completed intervention;
- infrastructure cost per active learner;
- support time per teacher/cohort.

## 11. 90-day milestone gates

### Days 1-30: Detection and feasibility

Build/verify only pilot-critical capabilities.

Must achieve:
- evidence is skill-mapped;
- teacher can inspect source evidence;
- Milo can produce explainable signals;
- teacher can approve/reject;
- baseline workload and learning data collected;
- pilot analytics working.

Gate to Days 31-60:
- no critical safety/privacy issue;
- signal workflow is usable;
- teacher finds at least some Milo signals meaningfully actionable;
- data required for intervention evaluation is being captured reliably.

### Days 31-60: Teacher-approved intervention

Activate:
- temporary groups;
- intervention plans;
- Milo tutoring;
- retries;
- transfer checks;
- group progress.

Gate to Days 61-90:
- intervention workflow completes end-to-end;
- teacher remains in control;
- meaningful learner improvement is observed in at least some cases;
- workload remains acceptable;
- major false-positive patterns have been corrected.

### Days 61-90: Retention, replication, and continuation

Add:
- delayed retention checks;
- intervention exit/dissolution;
- enrichment cases;
- second cohort/teacher if feasible;
- willingness-to-continue evaluation;
- willingness-to-pay research only after educational value is visible.

End-of-Phase decision:
- proceed to larger efficacy evaluation;
- run a second refined pilot;
- narrow/reposition;
- redesign core logic;
- stop if neither educational value nor teacher value emerges.

## 12. Current LMU architecture audit

The current platform already contains a substantial portion of the required foundation.

### Already present in live Supabase

- normal classrooms;
- intervention classroom type;
- enrichment classroom type;
- parent_classroom_id for temporary groups;
- classroom memberships;
- curriculum skills;
- learning items mapped to skills;
- learner submissions;
- teacher review with mastery judgment;
- explicit misconception text;
- recommended next step;
- independent-evidence flag;
- mastery_evidence;
- learner_skill_mastery;
- evidence count;
- independent and assisted evidence counts;
- misconception count;
- mastery confidence;
- mastery trend;
- Milo learning sessions/events;
- assistance level;
- transfer_result field;
- recommendation type: intervention/reinforcement/enrichment/monitor;
- teacher recommendation approval/rejection;
- group_classroom_id;
- teacher classroom roster/mastery/submission RPCs.

### Existing intervention primitive

The current `approve_milo_recommendation` RPC can already:
- verify teacher ownership;
- approve an intervention/enrichment recommendation;
- create a temporary child classroom;
- link it to the parent classroom;
- add the recommended learner.

This is valuable, but it currently acts on one learner recommendation at a time.

### Current gaps

Pilot-critical gaps are:

1. cluster recommendations by shared skill/misconception;
2. group multiple learners into one proposed intervention;
3. store group objective, entry reason, review date, exit criteria, and lifecycle;
4. support teacher editing of proposed membership before approval;
5. distinguish individual/group/class/change signals;
6. record contradictory evidence and uncertainty;
7. connect Milo learning events to intervention/group outcomes;
8. implement explicit transfer and delayed-retention workflow;
9. recommend learner exit and group dissolution;
10. build a teacher intelligence dashboard centered on actionable signals;
11. measure teacher workload and implementation fidelity;
12. add validation event instrumentation and pilot cohort metadata;
13. create safe observable behavioral/change signals without diagnostic labels;
14. broaden the active CAPS skill catalogue beyond the current pilot seed data.

## 13. Product freeze rules

During Phase 1:
- no broad new feature families;
- no new social/entertainment expansion;
- no additional curricula unless necessary for pilot;
- no autonomous high-stakes decisions;
- no autonomous behavioral diagnosis;
- no redesign unrelated to pilot usability.

Allowed work:
- defects;
- security;
- reliability;
- teacher intelligence;
- evidence quality;
- intervention lifecycle;
- pilot analytics;
- required accessibility;
- consent/privacy;
- pilot-critical curriculum content.

## 14. Pilot-critical implementation backlog

P0:
- Teacher Intelligence data contract
- grouped misconception/strength signal model
- intervention proposal model
- teacher decision workflow
- intervention lifecycle and exit rules
- transfer + delayed retention events
- pilot analytics/fidelity instrumentation
- dashboard prototype
- consent/privacy review

P1:
- enrichment-group lifecycle
- parent progress summaries
- second-cohort replication tools
- teacher workload timer/quick logging
- intervention outcome reports

P2:
- broader subjects/curricula
- advanced predictive models
- large-scale school admin analytics
- institutional integrations

## 15. Research basis

This blueprint is grounded in a multi-workstream research pass covering intelligent tutoring systems, teacher-facing formative assessment, flexible grouping/MTSS, AI child safeguards, South African learner-support policy, and EdTech pilot evaluation.

Key sources reviewed:

1. Létourneau et al. (2025), "A systematic review of AI-driven intelligent tutoring systems (ITS) in K-12 education", npj Science of Learning.
   https://www.nature.com/articles/s41539-025-00320-7

2. Prediger et al. / related authors (2025), "How to Best Support Teachers' Adaptive Task-Selection Practices by Formative Assessment Reports? An Experiment", International Journal of Science and Mathematics Education.
   https://link.springer.com/article/10.1007/s10763-025-10561-y

3. Department of Basic Education, South Africa, Policy on Screening, Identification, Assessment and Support (SIAS).
   https://www.education.gov.za/Portals/0/Documents/Policies/SIAS%20Final%2019%20December%202014.pdf

4. Education Endowment Foundation, Guidance for EEF pilot evaluations.
   https://impactamas.summaedu.org/wp-content/uploads/2025/05/Pilot-guidance-Oct-2023.pdf

5. UNESCO, Guidance for generative AI in education and research, updated 2026.
   https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research

6. Recent K-12 AI teacher-intervention literature supports a monitoring -> judgment -> intervention -> orchestration cycle and emphasizes teacher interpretation rather than autonomous AI action.

## 16. Phase 1 decision rule

The blueprint is successful only if it lets the team answer, with evidence:

1. What did Milo detect?
2. Why did it detect it?
3. Did the teacher agree?
4. What action was approved?
5. Did the learner improve?
6. Did improvement transfer?
7. Was it retained?
8. Did the intervention reduce or increase teacher workload?
9. Was the process safe and understandable?
10. Would the teacher use LMU again?

If LMU cannot answer those ten questions reliably, the product is not ready to scale.

If it can, Phase 2 should move from feasibility/validation into a larger, more rigorous efficacy evaluation.
