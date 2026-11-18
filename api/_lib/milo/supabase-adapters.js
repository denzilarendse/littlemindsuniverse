import { adminGet, adminRpc } from '../supabase.js';
import { assertUuid, MiloValidationError } from './memory-validation.js';

const LIMIT = 500;
const uuid = value => assertUuid(value, 'identifier');
const eq = (column, value) => `${column}=eq.${encodeURIComponent(value)}`;
const list = (column, values) => values.length
  ? `${column}=in.${encodeURIComponent('(' + values.join(',') + ')')}`
  : null;
const path = (table, select, filters = [], order = null) => {
  const params = ['select=' + encodeURIComponent(select), ...filters.filter(Boolean), 'limit=' + LIMIT];
  if (order) params.push('order=' + encodeURIComponent(order));
  return table + '?' + params.join('&');
};
async function rows(get, table, select, filters, order) {
  const result = await get(path(table, select, filters, order));
  if (!Array.isArray(result)) throw new MiloValidationError('Unexpected database response for ' + table, 502);
  return result;
}
function mapMemory(row) { if (!row) return null; return { ...row, learnerId:row.learner_id, memoryKey:row.memory_key, category:row.memory_category, value:row.memory_value, sourceType:row.source_type, sourceReference:row.source_reference, visibilityScope:row.visibility_scope, confirmedBy:row.confirmed_by, confirmedAt:row.confirmed_at, expiresAt:row.expires_at, createdAt:row.created_at, updatedAt:row.updated_at }; }
function mapRpcMemory(result) { const row=unwrapRpc(result); return row && typeof row==='object' ? mapMemory(row) : row; }
function ids(items) { return [...new Set(items.map(x => x?.id).filter(x => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)))]; }
function unwrapRpc(result) { return Array.isArray(result) && result.length === 1 ? result[0] : result; }

export function createSupabaseAcademicHistoryRepository({ get = adminGet } = {}) {
  if (typeof get !== 'function') throw new TypeError('Supabase adminGet adapter required');
  let submissionIds = null;
  let verificationCycleIds = null;
  let recommendationIds = null;
  const learnerFilter = learnerId => [eq('learner_id', uuid(learnerId))];
  return {
    async submissions({ learnerId }) {
      const result = await rows(get, 'learner_submissions',
        'id,learning_item_id,learner_id,status,assistance_level,submitted_at,created_at,evidence_json',
        learnerFilter(learnerId), 'submitted_at.desc');
      submissionIds = ids(result);
      return result;
    },
    async reviews({ learnerId }) {
      if (!submissionIds) await this.submissions({ learnerId });
      if (!submissionIds.length) return [];
      return rows(get, 'submission_reviews',
        'id,submission_id,teacher_profile_id,mastery_judgement,misconception,teacher_feedback,recommended_next_step,independent_evidence,misconception_code,misconception_note,created_at',
        [list('submission_id', reviewIds)], 'created_at.desc');
    },
    masteryEvidence: args => rows(get, 'mastery_evidence',
      'id,learner_id,skill_id,learning_item_id,submission_id,review_id,judgement,assistance_level,independent_evidence,misconception,misconception_code,misconception_note,observed_at,created_at',
      learnerFilter(args.learnerId), 'observed_at.desc'),
    masterySnapshots: args => rows(get, 'learner_skill_mastery',
      'learner_id,skill_id,current_judgement,confidence,trend,evidence_count,independent_evidence_count,assisted_evidence_count,misconception_count,last_evidence_at,updated_at',
      learnerFilter(args.learnerId), 'last_evidence_at.desc'),
    learningSessions: args => rows(get, 'milo_learning_sessions',
      'id,profile_id,learner_id,learning_item_id,primary_skill_id,engine,session_mode,assistance_level,status,started_at,completed_at',
      learnerFilter(args.learnerId), 'started_at.desc'),
    learningEvents: args => rows(get, 'milo_learning_events',
      'id,session_id,profile_id,learner_id,learning_item_id,skill_id,engine,activity_type,attempt_number,assistance_level,independence,transfer_result,occurred_at',
      learnerFilter(args.learnerId), 'occurred_at.desc'),
    assistanceEvents: args => rows(get, 'milo_assistance_events',
      'id,profile_id,learner_id,learning_item_id,actor_role,assessment_context,effective_help_level,provider,model,outcome,created_at',
      learnerFilter(args.learnerId), 'created_at.desc'),
    async verificationCycles({ learnerId }) {
      const result = await rows(get, 'learning_verification_cycles',
        'id,learner_id,skill_id,baseline_judgement,baseline_confidence,baseline_evidence_count,baseline_independent_evidence_count,retention_delay_days,status,transfer_demonstrated_at,retention_due_at,retention_demonstrated_at,started_at,completed_at,updated_at',
        learnerFilter(learnerId), 'started_at.desc');
      verificationCycleIds = ids(result);
      return result;
    },
    async verificationObservations({ learnerId }) {
      if (!verificationCycleIds) await this.verificationCycles({ learnerId });
      if (!verificationCycleIds.length) return [];
      return rows(get, 'learning_verification_observations',
        'id,cycle_id,stage,source_event_id,source_mastery_evidence_id,result,independence,assistance_level,novel_context,teacher_profile_id,observed_at',
        [list('cycle_id', cycleIds)], 'observed_at.desc');
    },
    async recommendations({ learnerId }) {
      const result = await rows(get, 'milo_recommendations',
        'id,classroom_id,learner_id,skill_id,recommendation_type,rationale,recommended_action,evidence_count_snapshot,status,source,approved_by,approved_at,rejected_by,rejected_at,created_at,updated_at,signal_id,decision_note,deferred_at',
        learnerFilter(learnerId), 'created_at.desc');
      recommendationIds = ids(result);
      return result;
    },
    async recommendationDecisions({ learnerId }) {
      if (!recommendationIds) await this.recommendations({ learnerId });
      if (!recommendationIds.length) return [];
      return rows(get, 'milo_recommendation_decisions',
        'id,recommendation_id,teacher_profile_id,decision,previous_status,new_status,previous_learner_ids,new_learner_ids,note,created_at',
        [list('recommendation_id', recommendationIds)], 'created_at.desc');
    },
    weeklyReports: args => rows(get, 'weekly_reports',
      'id,classroom_id,learner_id,teacher_profile_id,week_start,status,summary,strengths,next_steps,home_support,approved_at,created_at,updated_at',
      learnerFilter(args.learnerId), 'week_start.desc')
  };
}

export function createSupabaseMiloMemoryRepository({ get = adminGet, rpc = adminRpc } = {}) {
  if (typeof get !== 'function' || typeof rpc !== 'function') throw new TypeError('Supabase server adapters required');
  return {
    async getMemoryItem(memoryItemId) {
      uuid(memoryItemId);
      const found = await rows(get, 'learner_memory_items', '*', [eq('id', memoryItemId)]);
      return mapMemory(found[0] || null);
    },
    async listMemoryItems({ learnerId, includeInactive = false }) {
      const filters = [eq('learner_id', uuid(learnerId))];
      if (!includeInactive) filters.push('status=in.(proposed,confirmed,disputed)');
      return (await rows(get, 'learner_memory_items', '*', filters, 'updated_at.desc')).map(mapMemory);
    },
    async listMemoryEvents({ learnerId, memoryItemId = null }) {
      const filters = [eq('learner_id', uuid(learnerId))];
      if (memoryItemId) filters.push(eq('memory_item_id', uuid(memoryItemId)));
      return rows(get, 'learner_memory_events', '*', filters, 'occurred_at.desc');
    },
    async proposeMemory({ actorProfileId, input, reason }) {
      uuid(actorProfileId);
      return mapRpcMemory(await rpc('milo_memory_propose', {
        p_actor_profile_id: actorProfileId, p_input: input, p_reason: String(reason || '').slice(0, 500)
      }));
    },
    async confirmMemory({ actorProfileId, memoryItemId, reason }) {
      uuid(actorProfileId); uuid(memoryItemId);
      return mapRpcMemory(await rpc('milo_memory_confirm', {
        p_actor_profile_id: actorProfileId, p_memory_item_id: memoryItemId, p_reason: String(reason || '').slice(0, 500)
      }));
    },
    async updateMemory({ actorProfileId, memoryItemId, input, reason }) {
      uuid(actorProfileId); uuid(memoryItemId);
      return mapRpcMemory(await rpc('milo_memory_update', {
        p_actor_profile_id: actorProfileId, p_memory_item_id: memoryItemId, p_input: input, p_reason: String(reason || '').slice(0, 500)
      }));
    },
    async transitionMemory({ actorProfileId, memoryItemId, eventType, reason }) {
      uuid(actorProfileId); uuid(memoryItemId);
      const rpcName = { dispute: 'milo_memory_dispute', withdraw: 'milo_memory_withdraw', expire: 'milo_memory_expire' }[eventType];
      if (!rpcName) throw new MiloValidationError('Unsupported memory transition');
      return mapRpcMemory(await rpc(rpcName, {
        p_actor_profile_id: actorProfileId, p_memory_item_id: memoryItemId, p_reason: String(reason || '').slice(0, 500)
      }));
    }
  };
}
