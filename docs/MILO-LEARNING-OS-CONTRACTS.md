# Milo Learning OS — Common Contracts

These are logical contracts. Exact SQL/TypeScript shapes are implemented only after mapping them to the current schema and runtime.

## LearnerContext

Required:
- learnerId
- ageStage
- curriculumId / curriculumVersion
- curriculumNodeId when known
- language
- masterySnapshot
- sessionMode: learn | practice | assessment | project
- assistanceLimit
- consentCapabilities
- role/authorization context

Never use user-editable profile metadata as authorization.

## CurriculumNode

- id
- curriculum / version
- stage / grade
- subject
- strand / topic
- skill
- prerequisites[]
- learningObjectives[]
- evidenceExpectations[]
- permittedModalities[]
- assessmentConstraints

## EngineRequest

- sessionId
- learnerContext
- curriculumNode
- learningGoal
- requestedModality
- priorAttemptSummary
- tutorPolicy
- permittedTools[]

No raw credential or privileged database secret may appear in an EngineRequest.

## EngineResult

- engine
- learnerFacingTurn
- nextAction
- learningEvents[]
- requestedToolAction?
- safetyEvents[]
- completionState: continue | transfer_check | complete | teacher_attention

## TutorPolicy

- directAnswerPolicy
- assessmentMode
- maxAssistanceLevel
- requireFirstAttempt
- requireTransferCheck
- allowedExampleSimilarity
- teacherApprovalRequired
- ageLanguageRules
- sessionTurn/time bounds

## ToolPermission

- tool
- learnerId
- sessionId
- purpose
- allowedOperations[]
- expiresAt
- consentBasis when required

Tool permissions are server-enforced and least-privilege. UI visibility is not authorization.

## LearningEvent

- eventId
- learnerId
- sessionId
- curriculumNodeId
- engine
- activityType
- attemptNumber
- assistanceLevel
- independence
- misconceptionTags[]
- evidenceRef?
- transferResult?
- occurredAt

LearningEvent is the common progress vocabulary. It is not automatically a mastery judgement.

## EvidenceAdapter

Converts eligible LearningEvents/tool artifacts into the existing governed evidence model:
- sourceEventId
- evidenceType
- privateStorageRef?
- responseSummary?
- assistanceLevel
- capturedAt
- consentStatus
- reviewRequired

No public child-evidence URL.

## SafetyEvent

- eventId
- sessionId
- learnerId
- category
- severity
- actionTaken
- teacherOrGuardianAttentionRequired
- occurredAt

SafetyEvent must contain the minimum necessary information and must not copy sensitive conversation content when a categorical audit event is sufficient.

## Engine boundary

An engine may:
- request approved context
- produce teaching turns
- request permitted tools
- emit learning/safety events

An engine may not:
- bypass RLS/RPC authorization
- mutate mastery directly
- approve its own academic judgement
- broaden its own tool permissions
- expose private evidence publicly
- override assessment policy
- access unrestricted child-facing web browsing

## Brilliant Milo session contract

A live tutor session follows:
1. resolve curriculum position
2. diagnose
3. teach/model
4. require learner attempt
5. observe permitted work state
6. hint/question within assistance limit
7. retry
8. transfer check
9. emit evidence candidate
10. route through teacher/mastery governance

## Early-years contract

For ages 2–5:
- pre-reader-first interaction
- narration and large touch targets
- short bounded sessions
- minimal text entry
- motor/development-appropriate activities
- no manipulative engagement loops designed around endless use
- generated stories/activities constrained to approved age/curriculum/safety templates

## Coding sandbox contract

Generated or learner code executes only in an isolated environment with:
- no unrestricted shell
- no unrestricted network
- no host filesystem access
- resource/time limits
- allowlisted runtime/libraries
- auditable execution metadata for assessed projects
