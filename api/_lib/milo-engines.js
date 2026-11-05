// Milo Engines v4 - SECURITY REMEDIATED - masteryApproved NEVER true from AI
export const VALID_ENGINE_CODES = new Set(['BRILLIANT_TUTOR','ADAPTIVE_PRACTICE','REASONING_MISSIONS','EARLY_LEARNING','PLAY_STORY','VOICE_LANGUAGE','AI_LITERACY','CODING_BUILDER']);
export const ENGINE_DEFINITIONS = [
  { code:'BRILLIANT_TUTOR', name:'Brilliant Tutor', description:'Core adaptive tutor', ages:'2-18', evidenceType:'tutor_interaction', requiresTeacherApproval:false, allowedRoles:['learner','teacher'], helpLevels:[0,1,2,3,4,5], languages:['en','sasl'] },
  { code:'ADAPTIVE_PRACTICE', name:'Adaptive Practice', description:'Spaced practice', ages:'5-18', evidenceType:'practice_attempt', requiresTeacherApproval:false, allowedRoles:['learner','teacher'], helpLevels:[1,2,3,4], languages:['en','sasl'] },
  { code:'REASONING_MISSIONS', name:'Reasoning Missions', description:'Logic missions requiring teacher review for mastery', ages:'8-18', evidenceType:'reasoning_evidence', requiresTeacherApproval:true, allowedRoles:['learner','teacher'], helpLevels:[2,3,4], languages:['en'] },
  { code:'EARLY_LEARNING', name:'Early Learning', description:'Early explorers 2-7', ages:'2-7', evidenceType:'early_evidence', requiresTeacherApproval:false, allowedRoles:['learner','teacher'], helpLevels:[0,1,2], languages:['en','sasl'] },
  { code:'PLAY_STORY', name:'Play Story', description:'Play-based story', ages:'2-7', evidenceType:'play_evidence', requiresTeacherApproval:false, allowedRoles:['learner','teacher'], helpLevels:[0,1,2,3], languages:['en','sasl'] },
  { code:'VOICE_LANGUAGE', name:'Voice Language', description:'Reading and speech with consent boundary', ages:'2-18', evidenceType:'voice_evidence', requiresTeacherApproval:false, allowedRoles:['learner','teacher'], helpLevels:[0,1,2,3], languages:['en','sasl'] },
  { code:'AI_LITERACY', name:'AI Literacy', description:'AI creativity portfolio', ages:'8-18', evidenceType:'ai_literacy_evidence', requiresTeacherApproval:false, allowedRoles:['learner','teacher'], helpLevels:[2,3,4,5], languages:['en'] },
  { code:'CODING_BUILDER', name:'Coding Builder', description:'Coding projects requiring teacher review for mastery', ages:'8-18', evidenceType:'coding_evidence', requiresTeacherApproval:true, allowedRoles:['learner','teacher'], helpLevels:[2,3,4,5], languages:['en'] },
];
export function createEngineContext({ trusted, profile, age, curriculum, subject }) {
  return {
    role: profile?.role || trusted?.role || 'learner',
    age: age ?? trusted?.age ?? 10,
    curriculum: curriculum || trusted?.curriculum || null,
    subject: subject || trusted?.subject || null,
    learnerId: trusted?.learnerId || null,
    learningItemId: trusted?.learningItemId || null,
    level: trusted?.level ?? 2,
    evidenceBoundary: { learnerAttempt:true, aiAssistance:true, teacherReviewed:false, masteryApproved:false },
    authenticatedTeacherSession: trusted?.authenticatedTeacherSession || null,
  };
}
export function validateEngineRequest(engineCode, context) {
  if (!VALID_ENGINE_CODES.has(engineCode)) throw new Error(`Invalid engine: ${engineCode}`);
  const engine = ENGINE_DEFINITIONS.find(e=>e.code===engineCode);
  if (!engine.allowedRoles.includes(context.role)) throw new Error(`Role ${context.role} not allowed for ${engineCode}`);
  if (!engine.helpLevels.includes(context.level)) throw new Error(`Help level ${context.level} not allowed for ${engineCode}`);
}
export function getEngineByCode(code){ return ENGINE_DEFINITIONS.find(e=>e.code===code); }
export function listEngines(){ return ENGINE_DEFINITIONS; }
export function assertTeacherOnlyMastery(context) {
  if (!context) throw new Error('Context required');
  if (context.role !== 'teacher') throw new Error('Mastery approval requires authenticated human teacher - role check failed');
  const sess = context.authenticatedTeacherSession;
  if (!sess || !sess.isAuthenticated || !sess.teacherId) throw new Error('Mastery approval requires authenticated teacher session with teacherId - session missing');
  if (context.evidenceBoundary) { context.evidenceBoundary.masteryApproved=false; context.evidenceBoundary.teacherReviewed=false; }
  return { valid:false, reason:'Use teacher RPC approve_mastery with teacher-to-learner assignment + RLS - AI never approves mastery' };
}
