import { test } from 'node:test';
import assert from 'node:assert';
import { selectEngine, routeEngineRequest } from '../api/_lib/milo-engine-router.js';

test('8 engines routable', () => {
  const codes = ['BRILLIANT_TUTOR','ADAPTIVE_PRACTICE','REASONING_MISSIONS','EARLY_LEARNING','PLAY_STORY','VOICE_LANGUAGE','AI_LITERACY','CODING_BUILDER'];
  for (const c of codes) assert.ok(selectEngine({ age:10, requestedEngine:c }) === c);
});

test('invalid engine 400', () => {
  assert.throws(()=>selectEngine({ age:10, requestedEngine:'FAKE' }), /Invalid/);
});

test('learner can use reasoning missions without teacher session - flagged for review', () => {
  const trusted = { learnerId:'1', learningItemId:'1', assessment:false, level:2, age:10, authenticatedTeacherSession: null };
  const routed = routeEngineRequest({ engineCode:'REASONING_MISSIONS', trusted, profile:{role:'learner'}, age:10 });
  assert.ok(routed.requiresTeacherReview === true);
  assert.ok(routed.context.evidenceBoundary.masteryApproved === false);
});

test('mastery approval requires teacher session', () => {
  const trusted = { learnerId:'1', learningItemId:'1', assessment:false, level:2, age:10, action:'approve_mastery', authenticatedTeacherSession: null };
  assert.throws(()=>routeEngineRequest({ engineCode:'REASONING_MISSIONS', trusted, profile:{role:'teacher'}, age:10 }), /Teacher approval/);
});
