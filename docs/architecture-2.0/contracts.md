# Milo Learning OS shared contracts

These contracts are architectural interfaces. Concrete database/API shapes must be introduced through reviewed migrations and typed runtime validators.

## 1. LearnerContext

```ts
type LearnerContext = {
  learnerId: string;
  profileId?: string;
  ageYears?: number;
  stageCode: 'early' | 'foundation' | 'discovery' | 'creator' | 'pathfinder' | 'edge';
  countryCode?: string;
  curriculumCode?: string;
  yearLevel?: string;
  classroomIds: string[];
  language: string;
  currentLearningItemId?: string;
  currentSkillIds: string[];
  mastery: SkillMasterySummary[];
  misconceptions: MisconceptionSummary[];
  assistancePolicy: AssistancePolicy;
  consent: ConsentSummary;
  safety: SafetyContext;
};
```

Rules:
- learner identity and authorization are server/database-derived;
- client-supplied learner IDs are never trusted without relationship checks;
- age/stage is authoritative from LMU records, not guessed from conversation;
- sensitive consent fields are minimized to what the engine needs.

## 2. CurriculumNode

```ts
type CurriculumNode = {
  id: string;
  curriculumCode: string;
  stageCode: string;
  yearLevel?: string;
  subject: string;
  strand?: string;
  topic?: string;
  skillId?: string;
  title: string;
  prerequisites: string[];
  learningObjectives: string[];
};
```

The curriculum graph is the source of academic routing. Free-text subject search resolves into CurriculumNodes before lesson generation.

## 3. EngineRequest

```ts
type EngineRequest = {
  sessionId: string;
  engine: LearningEngineId;
  intent: 'teach' | 'practice' | 'hint' | 'explain' | 'mission' | 'project' | 'language' | 'code';
  learner: LearnerContext;
  curriculum?: CurriculumNode;
  userInput?: string;
  currentWork?: WorkSnapshot;
  toolBudget: ToolPermission[];
  assessmentMode: boolean;
};
```

## 4. EngineResult

```ts
type EngineResult = {
  sessionId: string;
  engine: LearningEngineId;
  responseMode: 'voice' | 'text' | 'interactive' | 'whiteboard' | 'code' | 'mixed';
  learnerFacing: StructuredTutorTurn;
  proposedTools: ToolInvocation[];
  learningEvents: LearningEvent[];
  safetyEvents: SafetyEvent[];
  completion: 'continue' | 'objective_met' | 'teacher_required' | 'guardian_required' | 'blocked';
};
```

## 5. TutorPolicy

TutorPolicy decides what Milo is allowed to do in the current context.

Minimum policy states:
- free exploration;
- teaching;
- guided practice;
- homework support;
- authentic assessment;
- teacher-observed assessment;
- coding project;
- language practice.

Protected-work behavior:
- do not provide the target answer;
- request a learner attempt where developmentally appropriate;
- teach using an analogous example;
- provide graduated hints;
- require transfer to a new or target example;
- log assistance level;
- escalate to teacher when repeated support exceeds policy.

## 6. ToolPermission

```ts
type ToolPermission = {
  tool: 'whiteboard' | 'voice' | 'camera' | 'video' | 'attach' | 'manipulative' | 'code_sandbox' | 'curriculum_search';
  allowed: boolean;
  reason: string;
  expiresAt?: string;
  limits?: Record<string, number | string | boolean>;
};
```

Permissions combine age, role, guardian consent, assignment context, device capability and safety policy. UI visibility is not authorization.

## 7. LearningEvent

```ts
type LearningEvent = {
  eventId: string;
  learnerId: string;
  sessionId: string;
  learningItemId?: string;
  skillId?: string;
  engine: LearningEngineId;
  activityType: string;
  attemptNumber: number;
  assistanceLevel: number;
  independent: boolean;
  misconceptionTags: string[];
  transferCheck?: 'not_run' | 'attempted' | 'passed' | 'needs_support';
  evidenceRefs: string[];
  occurredAt: string;
};
```

LearningEvents are append-oriented observations. They do **not** directly set mastery.

## 8. EvidenceAdapter

EvidenceAdapter converts eligible LearningEvents/tool outputs into governed evidence.

Rules:
- preserve original learner work;
- mark assistance accurately;
- attach curriculum/skill provenance;
- use private storage for media;
- consent-sensitive media remains pending until guardian approval;
- teacher-visible academic evidence follows existing authorization;
- teacher review remains the mastery synchronization gate unless a future reviewed policy explicitly creates a narrowly bounded auto-evidence path.

## 9. SafetyEvent

```ts
type SafetyEvent = {
  eventId: string;
  sessionId: string;
  learnerId: string;
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  action: 'continue' | 'redirect' | 'block' | 'notify_guardian' | 'notify_teacher' | 'human_review';
  occurredAt: string;
};
```

SafetyEvent records must avoid storing unnecessary sensitive free text.

## 10. Engine registry

```ts
type LearningEngineId =
  | 'early_learning'
  | 'play_story'
  | 'ai_literacy'
  | 'reasoning'
  | 'voice_language'
  | 'adaptive'
  | 'coding_ai'
  | 'brilliant_milo';
```

The registry is internal. Learners interact with Milo rather than selecting competing AI identities.
