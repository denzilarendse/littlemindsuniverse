# Milo Personalised Academic Improvement and Mastery Workflow

**Status:** Product direction approved by the LMU owner, 18 November 2026.  
**Implementation status:** Workflow specification only; no live learner workflow or teacher UI is claimed to exist.  
**Applies to:** Teacher-governed CAPS-aligned learning support, per learner, per subject and per curriculum objective.

## 1. Purpose and governing principles

Milo operates as a continuous academic improvement partner to the teacher. It diagnoses evidence-based learning needs, proposes differentiated teaching and practice, monitors progress, prepares assessments and recommends next steps. The teacher remains the accountable decision-maker.

The class follows a shared weekly rhythm, but learners do not receive identical learning paths merely because they are in the same grade or subject.

Core principles:

1. **Individual evidence, individual plan:** each learner has their own objective-level learning profile, interventions, practice and assessment evidence.
2. **Curriculum alignment:** every plan maps to verified CAPS curriculum version, phase, grade, subject, term and objective(s).
3. **Teacher authority:** Milo drafts; the teacher approves, declines or edits. No unapproved assessment, intervention or formal learner outcome is published or assigned.
4. **Evidence before conclusions:** distinguish observed answers, attempts, time/context, teacher observations and Milo's inferences. Missing evidence is not proof of failure or mastery.
5. **Adaptive challenge:** Monday-to-Thursday difficulty generally progresses from easier to more challenging, but only when evidence supports progression. Milo must hold, scaffold or reduce difficulty when needed; the calendar must never force an unsuitable level.
6. **Mastery is objective-specific:** a learner may master one objective while continuing to need support on another. Never label a learner globally as weak or mastered based on one task.
7. **No fabricated certainty:** mastery criteria and thresholds must come from applicable curriculum/assessment policy or an explicitly configured, teacher-approved rubric—not invented universal percentages.
8. **Privacy and safeguarding:** use only the minimum learner data needed, with role-based access, retention controls and lawful authorisation. Do not expose one learner's profile to another learner.

## 2. Weekly classroom rhythm

The weekly rhythm has three instructional stages, with Saturday protected as a rest day.

| Day | Stage | Classroom focus | Milo's responsibility | Teacher control |
|---|---|---|---|---|
| Monday | 1 — Targeted learning | Begin with accessible, objective-specific exercises and teaching. | Use baseline evidence; issue the approved first set; monitor attempts and misconceptions; produce a daily progress report. | Approve the weekly plan and Monday activities; review exceptions and report. |
| Tuesday | 1 — Targeted learning | Continue teaching and targeted practice, adjusting to Monday evidence. | Update each learner's evidence; adapt explanation, scaffolding and task difficulty; report progress or decline. | Review daily report and approve material changes to the plan. |
| Wednesday | 1 — Targeted learning | Deepen or consolidate the selected objectives. | Increase challenge only where evidence supports it; otherwise revisit prerequisites or change intervention. | Review progress, exceptions and proposed changes. |
| Thursday | 1 — Targeted learning | Consolidate the week's objectives and prepare evidence for Friday revision. | Complete the targeted exercise sequence; identify persistent gaps and draft Friday revision focus. | Review the weekly evidence summary and confirm Friday focus. |
| Friday | 2 — Revision and mock assessment | Whole-week revision and teacher-approved mock assessments. | Analyse Mon–Thu evidence; draft an individual mock assessment blueprint and targeted mock assessment for each learner; continue evaluation; prepare recommendations and an assessment pack for teacher review. | Approve, edit or decline each assessment and its marking guidance before use; review Friday results and recommendations. |
| Saturday | Rest | No routine learner exercises or assessments. | No routine learner-facing tasks, reminders or performance pressure. Background data processing may occur only if permitted and should not create learner-facing activity. | No routine approval workload expected. |
| Sunday | 3 — Weekly mastery check | Final assessment of the week's approved learning objectives, where the school/teacher has scheduled this. | Prepare a teacher-approved final assessment using the week's evidence; evaluate submitted responses against approved criteria; produce weekly mastery and next-step report. | Approve the assessment before administration; review the final report and decide the next week's plan. |

**Scheduling note:** Sunday is specified as the weekly final assessment day by the product owner. Schools may configure the actual administration window to fit their timetable and learner circumstances. The Saturday rest principle must remain intact. The system must not silently schedule a Sunday assessment if the teacher/school has not enabled that practice.

## 3. Initial diagnosis and individual learner plan

Before the cycle starts, Milo establishes a baseline for each learner and each selected objective.

### 3.1 Required context

- Learner identifier (pseudonymous internally where practical).
- Verified grade, phase, subject and curriculum version.
- Term, topic and stable CAPS objective identifiers.
- Assessment language and approved explanation/support language.
- Relevant prerequisite objectives.
- Available evidence and its date/source.
- Teacher observations and accommodations that are authorised for use.
- Existing teacher-approved intervention and assessment plan.

Age alone must not be used to infer grade, ability or curriculum. Language proficiency must not be mistaken for subject understanding.

### 3.2 Diagnostic output

For each learner-objective pair, Milo records:

- what the learner demonstrated;
- what the learner has not yet demonstrated;
- observed error or misconception patterns;
- possible prerequisite gaps;
- evidence confidence and limitations;
- suggested teaching response;
- suggested practice and assessment evidence;
- proposed success criteria, with their policy/rubric source.

Milo must not diagnose a disability or medical condition. Where evidence suggests a need beyond ordinary academic support, it should recommend teacher/appropriate specialist review without making a clinical conclusion.

## 4. Daily Monday-to-Thursday learning loop

Each learner receives a differentiated plan. Learners in the same class may work on different objectives, prerequisite skills, explanations, task formats and challenge levels.

Daily loop:

1. **Teach:** teacher delivers or approves an explanation, demonstration, example or lesson sequence.
2. **Practise:** learner completes assigned, objective-linked exercises.
3. **Check:** capture answers, working/process where relevant, hints, attempts and teacher observations.
4. **Evaluate:** compare evidence with the objective's success criteria and prior evidence.
5. **Adapt:** recommend continue, scaffold, reteach, provide a different explanation, practise prerequisite knowledge, maintain challenge or extend.
6. **Report:** create a daily progress report for teacher review.

### 4.1 Progressive difficulty

The intended progression is accessible work on Monday, building toward more demanding application by Thursday. This is a default sequence, not a rigid rule.

Milo may recommend:
- increase difficulty when the learner demonstrates reliable understanding;
- maintain the current level when evidence is mixed;
- reduce task complexity or add scaffolding when errors indicate a missing foundation;
- switch representation or teaching approach when the learner is not responding;
- extend or enrich when the learner has already demonstrated mastery.

A learner must not be penalised for needing more time. The goal is meaningful progress, not matching another learner's pace.

### 4.2 Daily progress report

Each report contains:
- learner and class reference, subject, date and objective IDs;
- activities and approved plan version;
- evidence observed (not merely a single score);
- progress since the previous check;
- misconceptions and prerequisite gaps, clearly marked as observed or inferred;
- difficulty level and whether it was increased, held or reduced;
- confidence/limitations;
- recommendation and rationale;
- teacher decision status and audit timestamp.

## 5. Friday revision and individual mock assessment

Friday consolidates the week's work and provides a broader check of application.

Milo uses the evidence accumulated during the week to draft a distinct mock assessment for each learner. Assessments may overlap in curriculum objectives while differing in question selection, scaffolding or targeted coverage according to each learner's evidence and approved accommodations.

Before administration, the teacher receives a review pack containing:

1. weekly objectives and curriculum alignment;
2. learner-specific evidence summary;
3. proposed mock assessment and version;
4. assessment blueprint, cognitive demand and mark allocation;
5. memorandum/model answers and marking rubric;
6. accommodations and language settings;
7. Milo's rationale, limitations and recommended focus;
8. approve / edit / decline controls.

No Friday assessment is assigned or represented as teacher-approved until the teacher approves that exact version. Edits create a new version and require approval before use.

After results are submitted, Milo evaluates them alongside daily evidence, not in isolation, and prepares a Friday evaluation report and Sunday assessment proposal.

## 6. Saturday rest

Saturday is a protected rest day in the default weekly model:
- no required exercises, quizzes, mock assessments or learner-facing performance reminders;
- no escalation of missed work into Saturday by default;
- no punitive interpretation of inactivity;
- teacher may configure an exception only through an explicit school policy and appropriate approval.

## 7. Sunday final weekly assessment and evaluation

Sunday provides the final evidence check for the week's selected objectives, subject to teacher/school scheduling and prior teacher approval.

The assessment should:
- sample the objectives taught and practised during the week;
- test understanding and transfer, not merely repeat identical practice questions;
- use the approved assessment language, format, accommodations and rubric;
- be appropriate to the learner's grade, phase and developmental stage;
- preserve the assessment version, answers, marking evidence and reviewer.

Milo then generates a weekly report with objective-level outcomes, evidence trail, comparison with baseline, uncertainty and recommended next steps.

## 8. Mastery states and next-step recommendations

Milo reports mastery separately for each curriculum objective. The recommended states are:

- **Mastery demonstrated:** the learner has met the applicable, teacher-approved success criteria across sufficient and relevant evidence. This does not imply mastery of the entire subject or grade.
- **Mastery within reach:** evidence shows progress, but one or more criteria remain inconsistent; further targeted practice and assessment are recommended.
- **Further intervention required:** the learner has not yet demonstrated the prerequisite or objective outcomes; Milo proposes a revised teaching approach, prerequisite reteaching or other support.
- **Insufficient evidence:** there is not enough valid evidence to make a defensible judgement; gather more evidence rather than assigning a negative outcome.

Milo may also recommend enrichment or extension where evidence supports it.

The system must not hard-code a universal mastery percentage. Criteria must be tied to the relevant CAPS assessment requirements, a validated rubric or teacher-approved objective-specific criteria. Any score is only one piece of evidence.

## 9. Weekly report and teacher decision

The weekly report is addressed to the teacher and includes:

- learner's objective-by-objective mastery state;
- baseline-to-current progress;
- evidence from daily exercises, checks, Friday mock and Sunday assessment;
- strengths and demonstrated understanding;
- unresolved misconceptions and prerequisite gaps;
- confidence, missing evidence and limitations;
- recommended next steps and proposed weekly plan;
- suggested teaching strategy, targeted exercises and next assessment;
- curriculum/source citations;
- teacher decision controls.

Teacher decisions:
- **Approve:** approve the exact proposed plan/report actions for implementation.
- **Edit:** modify objectives, teaching strategy, exercises, assessment or criteria; edited version remains pending until approved.
- **Decline:** reject the recommendation and optionally record a reason.
- **Request more evidence:** defer a conclusion and request a specific additional check.

Milo must preserve the original report and all subsequent versions. A teacher decision is auditable and must never be inferred from silence.

## 10. Recommendation implementation and next cycle

Only teacher-approved actions are released to the learner/class. The next cycle is generated from the approved decision:

- Mastery demonstrated → move to the next mapped objective or approved enrichment, while retaining spaced review where appropriate.
- Mastery within reach → continue targeted practice, adjust explanation or scaffold, and reassess the unresolved criteria.
- Further intervention required → revisit prerequisite knowledge, change teaching approach and use smaller diagnostic checks.
- Insufficient evidence → collect additional evidence before deciding.
- Teacher declined or edited → follow the teacher's recorded decision; do not silently reinstate the declined plan.

A mastered objective remains in the learner's history as demonstrated at a particular time and under particular criteria. Later retrieval checks may detect forgetting without erasing the historical evidence.

## 11. Core data model

The implementation should model the following entities (names are conceptual; final database naming is subject to the existing LMU schema baseline and architecture):

- curriculum objective: stable CAPS objective, grade/subject/term/version and authoritative source.
- learner-objective profile: learner's current state for one objective; minimal, access-controlled data.
- diagnostic record: baseline evidence and diagnostic interpretation.
- learning plan: learner-specific plan, linked to objective IDs and curriculum version.
- learning activity: teaching item, exercise or practice task and its approved version.
- learner attempt: answer/work, attempt metadata and evidence provenance.
- progress observation: daily observed evidence and teacher observations.
- assessment blueprint: purpose, objectives, cognitive demand, language, format and criteria.
- assessment version: immutable assessment draft/version and approval state.
- assessment submission: learner response and submission metadata.
- evaluation report: daily, Friday or weekly evaluation, including evidence references.
- recommendation: Milo's proposed next steps, rationale and uncertainty.
- teacher decision: approve/edit/decline/request-evidence, reviewer, timestamp and exact version.
- implementation record: approved action assigned/published and completion state.
- mastery event: objective-specific state transition with evidence and criteria version.
- audit event: security-relevant access and workflow actions.

Every learner-linked record must enforce role and class/teacher access on the server/database, not merely hide UI controls. Avoid copying full learner profiles into prompts or reports when a minimal context reference will suffice.

## 12. State and version controls

Suggested workflow states:

- Learning plan: draft, pending_teacher_review, approved, declined, superseded, completed.
- Assessment: draft, pending_teacher_review, approved, declined, administered, marked, superseded.
- Recommendation: draft, pending_teacher_review, approved, edited_pending_approval, declined, implemented, superseded.
- Evidence sufficiency: sufficient, partial, insufficient, invalidated.
- Mastery: not_assessed, developing, within_reach, demonstrated, review_needed.

All edits create new versions. Reports must reference the exact curriculum, learning-plan, assessment and rubric versions used. A teacher's approval applies only to the exact version reviewed.

## 13. Quality, fairness and safety controls

- Test that two learners with different misconceptions receive appropriately different recommendations even when they share a grade and subject.
- Test that the same learner's plan changes when new evidence warrants it, and remains stable when evidence does not.
- Check curriculum alignment and resource rights before content is used.
- Keep assessment generation separate from final grading authority.
- Require teacher review for assessment drafts and material plan changes.
- Identify low-confidence or conflicting evidence and ask for teacher review.
- Do not rank learners against classmates or use peer performance as a mastery threshold.
- Do not treat language errors as subject errors unless the objective assesses that language skill.
- Support accommodations and accessible formats without lowering the curriculum objective by default.
- Audit teacher approvals, edits, declines, assessment versions and implementation.
- Use synthetic learner fixtures in development and tests; do not use real learner data in test fixtures.
- Keep Saturday rest behavior testable and configurable.
- Ensure Sunday assessment is disabled unless explicitly enabled by the school/teacher.

## 14. Acceptance criteria for implementation

The first implementation slice is acceptable only when tests demonstrate:

1. Separate objective-level profiles and plans for multiple learners in the same class.
2. Evidence-linked diagnosis and traceable recommendations.
3. Adaptive difficulty that can increase, hold or reduce based on evidence.
4. Daily report generation for Monday–Thursday.
5. Friday individual mock assessment drafts with teacher approval required before assignment.
6. Saturday rest behavior with no routine learner-facing tasks.
7. Sunday final assessment disabled by default and enabled only through school/teacher configuration and assessment approval.
8. Weekly objective-level mastery report with an insufficient-evidence state.
9. Teacher approve/edit/decline/request evidence workflow with immutable version history.
10. Only approved actions are implemented or assigned.
11. No hard-coded universal mastery percentage.
12. Role-based access and audit coverage for learner records and teacher decisions.

## 15. Delivery sequence

1. Specification and domain model — this document and reviewed entity/state definitions.
2. Curriculum objective foundation — import and validate a small official CAPS subject/grade/term slice with stable IDs and citations.
3. Synthetic workflow fixture — model two or more learners with distinct learning needs and a full weekly cycle.
4. Evaluation and report engine — objective-level evidence aggregation, uncertainty and report drafts.
5. Teacher approval vertical slice — approve/edit/decline/request evidence with immutable versions.
6. Exercise and assessment orchestration — create learner-specific tasks and teacher-approved Friday/Sunday assessments.
7. Milo integration — rights-aware curriculum retrieval and controlled context injection.
8. QA and pilot — teacher-authored scenarios, fairness checks, security review and supervised pilot.

Do not start production database migrations until the authoritative sanitised schema-only baseline and migration chain are recovered and reviewed. Do not deploy to production or use real learner data for the initial implementation.
