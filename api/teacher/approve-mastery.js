import { applyCors, HttpError, requireMethod, sendError } from '../_lib/http.js';
import { authenticateRequest, userRpc, adminGet, adminRpc } from '../_lib/supabase.js';
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    requireMethod(req, 'POST');
    const { user, accessToken } = await authenticateRequest(req);
    const profiles = await adminGet(`profiles?select=id,role&id=eq.${encodeURIComponent(user.id)}&limit=1`);
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile?.id || profile.role !== 'teacher') throw new HttpError(403, 'Teacher role required');
    const { learnerId, learningItemId, evidenceId } = req.body || {};
    if (!learnerId) throw new HttpError(400, 'learnerId required');
    let assigned = false;
    try {
      const check = await userRpc(accessToken, 'is_teacher_assigned_to_learner', { p_learner_id: learnerId });
      assigned = Array.isArray(check) ? check[0]?.assigned : check?.assigned;
      if (typeof assigned === 'undefined') assigned = !!check;
    } catch {
      const rows = await adminGet(`teacher_learner_assignments?select=learner_id&teacher_id=eq.${encodeURIComponent(profile.id)}&learner_id=eq.${encodeURIComponent(learnerId)}&limit=1`);
      assigned = Array.isArray(rows) && rows.length > 0;
    }
    if (!assigned) throw new HttpError(403, 'Teacher not assigned to this learner - assignment verification failed');
    const result = await userRpc(accessToken, 'approve_learner_mastery', { p_learner_id: learnerId, p_learning_item_id: learningItemId || null, p_evidence_id: evidenceId || null, p_teacher_id: profile.id });
    await adminRpc('log_milo_assistance_event', { p_profile_id: profile.id, p_learner_id: learnerId, p_learning_item_id: learningItemId || null, p_actor_role: 'teacher', p_assessment_context: true, p_effective_help_level: 5, p_provider: 'teacher_approval', p_model: 'human_teacher', p_outcome: 'mastery_approved_by_assigned_teacher' }).catch(()=>null);
    return res.status(200).json({ approved:true, learnerId, by: profile.id, assignmentVerified:true, via:'teacher_rpc_rls' });
  } catch (error) { return sendError(res, error); }
}
