// Router v4 - SECURITY REMEDIATED - assignment + RLS required for mastery approval
import { ENGINE_DEFINITIONS, validateEngineRequest, createEngineContext } from './milo-engines.js';
export const VALID_ENGINE_CODES = new Set(ENGINE_DEFINITIONS.map(e=>e.code));
export class InvalidEngineError extends Error { constructor(req){ super(`Invalid requestedEngine: ${req}`); this.code='INVALID_ENGINE'; this.status=400; } }
export class TeacherApprovalRequiredError extends Error { constructor(id){ super(`Teacher approval required for engine: ${id} - mastery approval is HUMAN ONLY via assigned teacher RPC`); this.code='TEACHER_APPROVAL_REQUIRED'; this.status=403; } }
export class TeacherNotAssignedError extends Error { constructor(){ super('Teacher not assigned to this learner - assignment check failed'); this.code='TEACHER_NOT_ASSIGNED'; this.status=403; } }
export function selectEngine({ age, subject, requestedEngine }) {
  if (requestedEngine) {
    const normalized = String(requestedEngine).trim().toUpperCase();
    if (!VALID_ENGINE_CODES.has(normalized)) throw new InvalidEngineError(requestedEngine);
    return normalized;
  }
  const safeAge = age === 'unknown' ? 10 : Number(age);
  if (safeAge <= 4) return 'EARLY_LEARNING';
  if (safeAge <= 7) { if (subject && /story|play|creative/i.test(subject)) return 'PLAY_STORY'; return 'EARLY_LEARNING'; }
  if (subject) {
    const s = subject.toLowerCase();
    if (/code|programming|builder|python|javascript/i.test(s)) return 'CODING_BUILDER';
    if (/ai literacy|creativity|portfolio|enterprise|finance/i.test(s)) return 'AI_LITERACY';
    if (/voice|language|reading|phonics|speech/i.test(s)) return 'VOICE_LANGUAGE';
    if (/reasoning|logic|mission|problem solving/i.test(s)) return 'REASONING_MISSIONS';
    if (/practice|adaptive|drill/i.test(s)) return 'ADAPTIVE_PRACTICE';
  }
  return 'BRILLIANT_TUTOR';
}
export function routeEngineRequest({ engineCode, trusted, profile, age, curriculum, subject }) {
  const context = createEngineContext({ trusted, profile, age, curriculum, subject });
  validateEngineRequest(engineCode, context);
  const engine = ENGINE_DEFINITIONS.find(e=>e.code===engineCode);
  const action = trusted?.action || null;
  const isMasteryApproval = action === 'approve_mastery' || action === 'mastery_approved';
  if (context.evidenceBoundary) { context.evidenceBoundary.masteryApproved=false; if (!isMasteryApproval) context.evidenceBoundary.teacherReviewed=false; }
  if (isMasteryApproval) {
    const sess = trusted?.authenticatedTeacherSession;
    if (!sess || !sess.isAuthenticated || !sess.teacherId) throw new TeacherApprovalRequiredError(engineCode);
    if (sess.assignmentVerified !== true) throw new TeacherNotAssignedError();
    throw new TeacherApprovalRequiredError(engineCode + ' - use /api/teacher/approve-mastery with assignment RPC');
  }
  const requiresTeacherReview = Boolean(engine?.requiresTeacherApproval);
  return { engineCode, context, allowed:true, requiresTeacherReview, timestamp:new Date().toISOString() };
}
export { ENGINE_DEFINITIONS } from './milo-engines.js';
