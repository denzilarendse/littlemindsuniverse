// Phase 5 - Milo Orchestrator - unified trusted context + 8-engine specialist routing
import { ENGINE_DEFINITIONS, createEngineContext, validateEngineRequest } from './milo-engines.js';
import { selectEngine, routeEngineRequest } from './milo-engine-router.js';
const ENGINE_PROMPTS = {
  BRILLIANT_TUTOR: (ctx) => `You are Brilliant Milo Tutor for ${ctx.age}yo, ${ctx.subject}. Teach, don't complete. Diagnose misconceptions, hints. HelpLevel ${ctx.level}.`,
  ADAPTIVE_PRACTICE: (ctx) => `Adaptive Practice for ${ctx.age}yo. Adapt to mastery, evidence count. Level ${ctx.level}.`,
  REASONING_MISSIONS: (ctx) => `Reasoning Missions for ${ctx.age}yo. Require explanation, justification. Assessment:${ctx.assessment}. Flag for teacher review if reasoning evidence.`,
  EARLY_LEARNING: (ctx) => `Early Learning ${ctx.age}yo: short warm sentences <${ctx.age<=4?60:100} words, concrete, playful, one idea at a time.`,
  PLAY_STORY: (ctx) => `Play & Story ${ctx.age}yo: narrative, imaginative, evidence kinds written/oral/visual.`,
  VOICE_LANGUAGE: (ctx) => `Voice & Language ${ctx.age}yo: reading aloud, transcription. Languages ${ctx.languages||'en'}. Consent boundary required.`,
  AI_LITERACY: (ctx) => `AI Literacy ${ctx.age}yo: portfolios, enterprise, ethical AI, career pathways.`,
  CODING_BUILDER: (ctx) => `Coding & AI Builder ${ctx.age}yo: code evidence, whiteboard, projects. Flag for teacher review.`
};
export function buildUnifiedContext({ trusted, profile, age, curriculum, subject }) {
  const base = createEngineContext({ trusted, profile, age, curriculum, subject });
  return { ...base, assessment: Boolean(trusted?.assessment), assignmentVerified: Boolean(trusted?.authenticatedTeacherSession?.assignmentVerified), consent: trusted?.consent || null, evidenceBoundary: { learnerAttempt: true, aiAssistance: true, teacherReviewed: false, masteryApproved: false } };
}
export function orchestrateEngineRequest({ engineCode, trusted, profile, age, curriculum, subject }) {
  const ctx = buildUnifiedContext({ trusted, profile, age, curriculum, subject });
  const selected = engineCode ? engineCode.toUpperCase() : selectEngine({ age, subject, requestedEngine: null });
  const routed = routeEngineRequest({ engineCode: selected, trusted: { ...trusted, assessment: ctx.assessment }, profile, age, curriculum, subject });
  validateEngineRequest(routed.engineCode, ctx);
  const engineDef = ENGINE_DEFINITIONS.find(e=>e.code===routed.engineCode);
  const systemPrompt = (ENGINE_PROMPTS[routed.engineCode]||ENGINE_PROMPTS.BRILLIANT_TUTOR)(ctx);
  return { engineCode: routed.engineCode, context: ctx, engineDef, systemPrompt, requiresTeacherReview: routed.requiresTeacherReview, evidence: { type: engineDef.evidenceType, boundary: ctx.evidenceBoundary, learnerAttempt: true }, meta: { engineCode: routed.engineCode, timestamp: routed.timestamp, allowed: true, requiresTeacherReview: routed.requiresTeacherReview } };
}
