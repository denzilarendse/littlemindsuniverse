// Milo 8-Engine Shared Intelligence Architecture - Phase 5 - Reconciled + Security Remediated
export const VALID_ENGINE_CODES = new Set(['BRILLIANT_TUTOR','ADAPTIVE_PRACTICE','REASONING_MISSIONS','EARLY_LEARNING','PLAY_STORY','VOICE_LANGUAGE','AI_LITERACY','CODING_BUILDER']);
const ALL_SA_LANGS = ['en','af','zu','xh','st','nso','tn','ss','ve','ts','nr','sasl'];
export const ENGINE_DEFINITIONS = [
  { code: 'BRILLIANT_TUTOR', name: 'Brilliant Milo Tutor', ages: '2-18', description: 'Core safe educational tutor', allowedRoles: ['learner','teacher','parent','admin'], evidenceType: 'tutor_interaction', requiresTeacherApproval: false, helpLevels: [0,1,2,3,4,5], languages: ['en','sasl'] },
  { code: 'ADAPTIVE_PRACTICE', name: 'Adaptive Practice', ages: '5-18', description: 'Personalized practice', allowedRoles: ['learner','teacher'], evidenceType: 'practice_attempt', requiresTeacherApproval: false, helpLevels: [0,1,2,3,4], adaptsOn: ['mastery_estimate','evidence_count','confidence','misconception_tags'], languages: ['en','sasl'] },
  { code: 'REASONING_MISSIONS', name: 'Reasoning Missions', ages: '8-18', description: 'Structured reasoning', allowedRoles: ['learner','teacher'], evidenceType: 'reasoning_evidence', requiresTeacherApproval: true, helpLevels: [0,1,2,3], protectsAssessment: true, languages: ['en'] },
  { code: 'EARLY_LEARNING', name: 'Early Learning Intelligence', ages: '2-7', description: 'Early Explorers 2-4 and Foundation 5-7', allowedRoles: ['learner','teacher','parent'], evidenceType: 'early_evidence', requiresTeacherApproval: false, helpLevels: [0,1,2], wordLimit: { '2-4': 60, '5-7': 100 }, stageGuidance: 'Early Explorers 2-4 and Foundation 5-7', languages: ['en','af','zu','xh','st','nso','tn','ss','ve','ts','nr','sasl'] },
  { code: 'PLAY_STORY', name: 'Play & Story Intelligence', ages: '2-10', description: 'Play-based and narrative learning', allowedRoles: ['learner','teacher','parent'], evidenceType: 'play_story_evidence', requiresTeacherApproval: false, helpLevels: [0,1,2,3], evidenceKinds: ['written','oral','visual','whiteboard'], languages: ALL_SA_LANGS },
  { code: 'VOICE_LANGUAGE', name: 'Voice & Language Intelligence', ages: '2-18', description: 'Voice, language, reading aloud', allowedRoles: ['learner','teacher','parent'], evidenceType: 'voice_language_evidence', requiresTeacherApproval: false, helpLevels: [0,1,2,3,4], requiresConsent: ['milo_read_aloud','audio_playback','camera','transcription'], languages: ALL_SA_LANGS },
  { code: 'AI_LITERACY', name: 'AI Literacy & Creativity', ages: '8-18', description: 'AI literacy, creativity, portfolios', allowedRoles: ['learner','teacher','parent','admin'], evidenceType: 'ai_literacy_evidence', requiresTeacherApproval: false, helpLevels: [1,2,3,4,5], focus: 'Full-stack portfolios', languages: ['en'] },
  { code: 'CODING_BUILDER', name: 'Coding & AI Builder', ages: '8-18', description: 'Coding, AI builder, projects', allowedRoles: ['learner','teacher'], evidenceType: 'coding_evidence', requiresTeacherApproval: true, helpLevels: [0,1,2,3,4,5], evidenceKinds: ['code','whiteboard','written','project'], languages: ['en'] }
];
export function createEngineContext({ trusted, profile, age, curriculum, subject }) {
  return {
    learnerId: trusted?.learnerId || null,
    learningItemId: trusted?.learningItemId || null,
    assessment: Boolean(trusted?.assessment),
    helpLevel: trusted?.level ?? trusted?.helpLevel ?? 2,
    level: trusted?.level ?? 2,
    role: profile?.role || trusted?.role || 'learner',
    age: age ?? trusted?.age ?? 10,
    curriculum: curriculum || trusted?.curriculum || 'CAPS',
    subject: subject || trusted?.subject || 'general learning',
    timestamp: new Date().toISOString(),
    evidenceBoundary: { learnerAttempt: true, aiAssistance: true, teacherReviewed: false, masteryApproved: false },
    authenticatedTeacherSession: trusted?.authenticatedTeacherSession || null,
    consent: trusted?.consent || null
  };
}
export function validateEngineRequest(engineCode, context) {
  if (!VALID_ENGINE_CODES.has(engineCode)) throw new Error(`Invalid engine: ${engineCode}`);
  const engine = ENGINE_DEFINITIONS.find(e=>e.code===engineCode);
  if (!engine.allowedRoles.includes(context.role)) throw new Error(`Role ${context.role} not allowed for ${engineCode}`);
  if (engine.helpLevels && !engine.helpLevels.includes(context.level ?? context.helpLevel)) throw new Error(`Help level ${context.level} not allowed for ${engineCode}`);
  return true;
}
export function getEngineByCode(code){ return ENGINE_DEFINITIONS.find(e=>e.code===code) || null; }
export function listEngines(){ return ENGINE_DEFINITIONS.map(e=>({ code:e.code, name:e.name, ages:e.ages })); }
export function assertTeacherOnlyMastery(context) {
  if (!context) throw new Error('Context required');
  if (context.role !== 'teacher') throw new Error('Mastery approval requires authenticated human teacher - role check failed');
  const sess = context.authenticatedTeacherSession;
  if (!sess || !sess.isAuthenticated || !sess.teacherId) throw new Error('Mastery approval requires authenticated teacher session with teacherId - session missing');
  if (context.evidenceBoundary) { context.evidenceBoundary.masteryApproved=false; context.evidenceBoundary.teacherReviewed=false; }
  return { valid:false, reason:'Use teacher RPC approve_mastery with teacher-to-learner assignment + RLS - AI never approves mastery' };
}
