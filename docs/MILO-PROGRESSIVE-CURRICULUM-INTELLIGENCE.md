# Milo Progressive Curriculum Intelligence (MPCI)

**Status:** Architecture specification; product direction approved 18 November 2026.  
**Scope:** CAPS progression from Grade R through Grade 12; first detailed comparison slice: FET Grades 10–12.  
**Implementation status:** Specification only. No complete authoritative progression map or runtime engine is claimed.

## 1. Governing principle

Milo must understand curriculum progression, not merely curriculum content. A grade is a distinct educational stage with its own expected knowledge, skills, depth, cognitive demand, sequence and assessment context. Similar topic names across grades do not prove equivalent requirements.

Distinguish shared knowledge, grade-specific expectations, progression relationships and evidence of mastery. Milo must never manufacture grade progression merely to create differences. Official requirements and progression relationships require source provenance and explicit review status.

## 2. FET Grades 10–12 comparison — source-derived findings

The uploaded Milo Curriculum v1.0 files were compared field by field on 18 November 2026.

| Finding | Grade 10 | Grade 11 | Grade 12 |
|---|---:|---:|---:|
| Subject entries | 20 | 20 | 20 |
| Topic records | 21 | 21 | 21 |
| Languages | English, Afrikaans, isiXhosa | Same | Same |

The subject-code sets and topic counts match. Topic IDs use grade-specific prefixes, and CAPS topic labels change to name the grade. Subject overview strings also substitute the grade number while otherwise retaining the same summary.

Across the 21 topic records, comparison of topic names, CAPS topic labels, cognitive levels, learning outcomes, key concepts, key vocabulary, common errors and exercise templates found:
- CAPS topic grade label differs in all 21 records;
- learning outcomes differ in one record (Home Language topic 01), where the grade number is substituted;
- exercise template differs in one record (Home Language topic 01), where the grade number is substituted;
- topic names, cognitive levels, key concepts, key vocabulary and common errors do not differ;
- remaining instructional outcomes and exercise templates are identical.

The metadata grade and grade label differ as expected. Assessment notes are identical. Subject overviews across all 20 subjects contain grade-labelled text, but the educational substance is not differentiated.

**Conclusion:** These supplied files are grade-labelled variants of a largely shared curriculum summary. They do not yet encode a verified Grade 10→11→12 progression.

### Source boundary and cautions

This finding concerns only the uploaded JSON summaries. It is not a claim that official CAPS Grade 10, 11 and 12 requirements are identical. The files provide broad CAPS-aligned summaries, not exact official document/page citations or term-by-term objectives. Generic FET assessment notes must not be treated as universal subject rules without checking current subject-specific policy. The 20 subject entries include aggregated subject groupings and are not necessarily 20 individual learner subject choices.

Machine-readable findings: data/curriculum-validation/fet-grade-10-12-comparison.json.

## 3. MPCI logical model

MPCI uses a graph of versioned curriculum nodes rather than relying on a flat grade/topic list.

### Curriculum identity
- Jurisdiction and curriculum (initially South Africa / CAPS).
- Curriculum version/effective date; phase, grade, subject and language.
- Topic/subtopic and term where the official source specifies one.
- Source document identifier and page/section reference.

### Grade-specific objective node
Each objective has a stable ID and status; grade, subject, term, topic and subtopic; source-faithful requirement text; knowledge, skill and cognitive demand; depth/complexity only where source-supported; assessment context; prerequisite IDs; provenance, review history and version.

### Shared concept node
A shared concept holds reusable conceptual identity, definitions and terminology. It does not replace grade-specific objective records. One shared concept may link to several grade objectives with different expectations and evidence criteria.

### Progression edge
Allowed relationship types:
- prerequisite_of — objective A is required or strongly supports objective B;
- develops_into — a later objective develops a previously introduced concept;
- revisits — concept is revisited, with grade-specific expectation recorded separately;
- extends — later expectation broadens or deepens an earlier one;
- applies_in — knowledge is applied in a new context;
- parallel_to — related objectives exist without asserting prerequisite order.

Every edge requires rationale, source reference or specialist-review record, confidence/status and version. Inferred edges are hypotheses and cannot silently become official requirements.

## 4. Source and validation states

1. source_summary — imported summary, not authoritative objective detail.
2. mapped_needs_review — provisionally mapped to official CAPS source.
3. verified_by_subject_specialist — source wording and mapping reviewed by an appropriately qualified specialist.
4. approved_for_teacher_use — approved for teacher-facing planning, subject to source currency and governance.
5. superseded — retained for audit but replaced by a newer source/version.

Promotion requires evidence and a recorded reviewer. Valid JSON or a grade label is not proof of curriculum authority.

## 5. Grade progression resolution

1. Resolve verified learner grade, subject, language and active curriculum version; never infer grade from age.
2. Resolve current grade-specific objective(s) and provenance.
3. Resolve prerequisite/progression links, excluding unreviewed hypotheses from authoritative claims.
4. Use learner evidence to identify which prerequisite or current objective is not demonstrated.
5. Teach at the learner's current point of need while retaining the grade-level destination.
6. Record evidence against the objective practised; do not award mastery for exposure or answer correctness alone.
7. Recommend next steps with sources and uncertainty; teacher approval remains required for formal plans and assessments.

A Grade 12 learner who struggles with a foundational Grade 10 concept may receive a targeted prerequisite lesson. The learner remains a Grade 12 learner; remediation does not rewrite their registered grade or lower the curriculum expectation.

## 6. Grades R–12 applicability

The same model applies across all phases, but fields and pedagogy must respect phase-specific curriculum structure and learner development. Grade R is not simply Grade 1 with easier questions. Phase, grade, subject structure, developmental appropriateness, language and assessment approach remain explicit. The uploaded dataset has uneven subject coverage and is not complete.

## 7. Integration contracts

- Curriculum Intelligence supplies verified objective nodes, shared concepts and provenance.
- Teaching Intelligence turns the selected objective and learner evidence into a lesson, worked example, guided practice and independent task.
- Mastery Intelligence evaluates evidence against objective-specific approved criteria.
- Teacher workflow reviews/approves plans, exercises and formal assessments where required.
- Learner memory stores only authorised, necessary learning evidence and preferences; it does not become curriculum authority.

## 8. Acceptance criteria

- [x] Compare uploaded Grades 10–12 JSON files structurally and field by field.
- [x] Record shared and grade-labelled differences without inventing missing progression.
- [x] Define shared concept, grade-specific objective and progression-edge model.
- [x] Define provenance and review states.
- [x] Specify prerequisite remediation without changing the learner's registered grade.
- [ ] Map FET objectives to current official CAPS documents and page/section references.
- [ ] Subject-specialist review of grade-specific progression and assessment expectations.
- [ ] Populate term-specific objectives and validated progression edges.

Unchecked items are subsequent evidence/enrichment work, not completed by this architecture phase.