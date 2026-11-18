# Milo Curriculum Intelligence Architecture

**Decision status:** Approved product direction from the LMU owner, 18 November 2026.
**Purpose:** Define Milo's curriculum brain as a governed, layered knowledge and recommendation system—not as an unstructured collection of PDFs.

## Core principle

Milo must distinguish what South African curriculum policy requires, what authorised learning resources explain, how concepts can be taught, how learning can be assessed, and what a teacher should consider doing next. These layers are linked by stable curriculum identifiers and provenance. A textbook is evidence for a topic; it is not itself the entire curriculum.

The curriculum is organised across CAPS Grades R–12 and the relevant phases, subjects, grades, languages and curriculum versions. Learner age, maturity, stage, language and support needs are used to make delivery age-appropriate; age alone must not be used to infer a learner's grade or curriculum.

## The five knowledge layers

### Layer 1 — Curriculum foundations and authority

**Question answered:** What is the learner expected to learn, and under which approved curriculum?

Knowledge includes:
- CAPS policy statements and amendments.
- Grade and phase structure (Foundation, Intermediate, Senior and FET).
- Subject aims, content, concepts, skills and learning objectives.
- Annual Teaching Plans, term sequence, time allocation and progression.
- Formal assessment requirements and curriculum-specific terminology.
- Version/effective-date history and authoritative source references.

Each curriculum objective receives a stable ID and is mapped to jurisdiction, curriculum, phase, grade, subject, topic/subtopic, term, skill/knowledge outcome, assessment expectation, source document and page/section. Policy content is kept distinct from editorial interpretation.

### Layer 2 — Authorised learning-resource library

**Question answered:** Which source material supports this objective?

Knowledge includes:
- DBE/state-owned learner textbooks.
- Teacher guides and lesson-support material.
- DBE workbooks and study guides.
- Approved publisher textbooks and teacher resources.
- Openly licensed resources and school/teacher-authorised material.
- Language-specific readers, diagrams, tables, practical activities and worked examples.

Every individual resource must carry title, publisher/owner, grade, subject, language, resource type, curriculum mapping, version, canonical source, checksum, retrieval/extraction state, page provenance and rights evidence. AI processing is blocked unless explicit per-resource permission is recorded. Public download availability is not treated as an AI-processing or redistribution licence.

### Layer 3 — Pedagogy, explanation and differentiation

**Question answered:** How can this concept be taught to this learner or class?

Knowledge includes:
- Concept explanations from simple to advanced.
- Teaching methods, examples, analogies and practical activities.
- Scaffolding, prerequisite knowledge and progression.
- Common misconceptions and corrective teaching strategies.
- Language support and multilingual explanation.
- Differentiation, accessibility, inclusion, remediation and enrichment.
- Age- and developmental-stage-appropriate presentation.

This layer is pedagogical guidance, not an authority that can override CAPS or teacher judgement. Recommendations must identify assumptions and adapt to verified learner/class context.

### Layer 4 — Assessment, evidence and evaluation

**Question answered:** What evidence would show that the objective has been understood?

Knowledge includes:
- Diagnostic, formative and summative assessment approaches.
- Questions, exercises, practical tasks and assessment blueprints.
- Rubrics, marking guidance and competency indicators.
- Misconception detection and learning-gap analysis.
- Feedback strategies and suggested next learning steps.
- Evidence-to-objective mapping and moderation notes.

Milo may draft assessments and analyse submitted evidence, but must distinguish observed evidence from inference. It must not fabricate marks, mastery or teacher decisions, and must not autonomously finalise a learner's grade.

### Layer 5 — Teacher planning and recommendation orchestration

**Question answered:** Given the curriculum, resources, pedagogy and evidence, what should the teacher consider next?

For a teacher request, Milo:
1. Resolves the verified curriculum, grade, subject, language and learner/class context.
2. Selects the relevant curriculum objectives from Layer 1.
3. Retrieves authorised, page-cited support from Layer 2.
4. Selects age-appropriate teaching strategies from Layer 3.
5. Designs assessment and evidence criteria from Layer 4.
6. Produces a structured recommendation draft.
7. Explains alignment, rationale, assumptions, limitations and source references.
8. Presents teacher actions: **Approve**, **Decline**, or **Edit**.
9. Records the original draft, teacher edits, decision, reviewer and timestamp.
10. Publishes or assigns only the teacher-approved version.

A teacher's edit or decline is feedback for future recommendation quality, not permission for Milo to silently change curriculum policy or bypass approval.

## Cross-cutting governance

- **Provenance:** every factual curriculum claim should be traceable to a policy or resource version and page/section where possible.
- **Rights:** rights are assessed per resource and per intended use (fetch, extract, OCR, store, index, AI process, quote, redistribute).
- **Child privacy and safety:** least-privilege access, data minimisation, guardian authorisation where legally required, approved AI providers, retention limits, age-appropriate safeguards and escalation.
- **Prompt-injection isolation:** textbook content, retrieved passages and user uploads are untrusted reference data, never system instructions.
- **Human authority:** teachers remain responsible for approval, grading and academic interventions.
- **Quality evaluation:** answer accuracy, curriculum alignment, page citation precision, language, age appropriateness, pedagogy, bias, insufficient-evidence handling and hallucination are tested separately.
- **Versioning:** curriculum changes and textbook editions must not silently rewrite the evidence behind an earlier teacher-approved plan.

## Minimum recommendation object

Each draft should contain:
- Target class/learner and verified curriculum context.
- Curriculum objective IDs and term/topic alignment.
- Learning outcomes and prerequisite knowledge.
- Source resources with page citations and rights state.
- Teaching approach, activity sequence and differentiation.
- Assessment tasks, rubric/evidence criteria and success indicators.
- Known misconceptions and corrective approaches.
- Assumptions, uncertainty and missing resources.
- Teacher decision state: `draft`, `approved`, `declined` or `edited-pending-approval`.
- Version, creator, reviewer and timestamps.

## Implementation sequence

1. Complete the resource inventory and legal/rights metadata model.
2. Extract PDF text per page; identify scanned pages for OCR review.
3. Validate extraction quality and preserve immutable provenance.
4. Map resources to Layer 1 curriculum objective IDs.
5. Build a searchable curriculum/resource index with rights-aware filters.
6. Add pedagogy and assessment knowledge sources with their own provenance.
7. Build the teacher recommendation composer and approval workflow.
8. Integrate retrieval into Milo's server-side route with strict context isolation.
9. Evaluate against teacher-authored CAPS scenarios before enabling live use.
10. Pilot with teacher review; only then widen access.

## Current implementation status

- Layer model and pipeline specification documented.
- Official DBE discovery seed covers 14 discovery endpoints and 21 known resource groups; not exhaustive.
- One Grade 10 Business Studies learner-book PDF has passed byte-level retrieval validation only.
- A Node PDF text-extraction adapter now extracts page-level text and provenance from controlled fixtures, and enforces explicit AI-processing permission.
- No OCR, durable index, curriculum mapping database, retrieval endpoint, Milo prompt-context integration or teacher approval UI is yet verified.

This architecture is the target design; it is not a claim that all five layers have been populated or implemented.


## Personalised academic improvement and mastery workflow

The five knowledge layers feed a teacher-governed weekly learning cycle. The detailed operating specification is maintained in [MILO-PERSONALISED-ACADEMIC-IMPROVEMENT-WORKFLOW.md](MILO-PERSONALISED-ACADEMIC-IMPROVEMENT-WORKFLOW.md).

The weekly rhythm is:
- **Monday–Thursday:** teach and practise individualised objectives, check evidence continuously, adapt difficulty and teaching strategy, and generate daily teacher progress reports.
- **Friday:** revision and individual mock assessments drafted from each learner's accumulated evidence. The exact assessment and marking guidance require teacher approval before administration.
- **Saturday:** protected rest day; no routine learner-facing tasks.
- **Sunday:** final weekly mastery assessment, only when enabled by the school/teacher and approved before administration; then produce an objective-level weekly progress and recommendation report.

The same classroom framework does not imply identical learner activities. Milo maintains an objective-specific profile and plan for each learner, based on verified evidence and prerequisite relationships. Difficulty may increase, hold or reduce; the day of the week never overrides the learner's evidence.

Milo's mastery outcomes are objective-specific: mastery demonstrated, mastery within reach, further intervention required, or insufficient evidence. No universal percentage is hard-coded. The applicable CAPS policy, validated rubric or teacher-approved criteria must define the success standard.

Teacher decisions (approve, edit, decline or request more evidence) are versioned and auditable. Only the exact teacher-approved plan, exercise or assessment version may be assigned or implemented. Milo reports evidence and recommendations; it does not autonomously finalise grades or teacher decisions.

This workflow is a product specification. Its implementation, teacher UI, learner evidence pipeline and live integration are not yet verified.
