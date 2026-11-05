import { test } from 'node:test';
import assert from 'node:assert';
import { assertTeacherOnlyMastery, createEngineContext } from '../api/_lib/milo-engines.js';
import { routeEngineRequest } from '../api/_lib/milo-engine-router.js';
test('AI evidence never approves mastery', () => {
  const ctx = createEngineContext({ trusted:{learnerId:'l1', level:2}, profile:{role:'learner'}, age:10 });
  assert.equal(ctx.evidenceBoundary.masteryApproved, false);
});
test('assertTeacherOnlyMastery does not set approved true from role', () => {
  const ctx = createEngineContext({ trusted:{learnerId:'l1', level:2, authenticatedTeacherSession:{isAuthenticated:true, teacherId:'t1'}}, profile:{role:'teacher'}, age:10 });
  const result = assertTeacherOnlyMastery(ctx);
  assert.equal(ctx.evidenceBoundary.masteryApproved, false);
  assert.equal(result.valid, false);
});
test('Learner cannot approve mastery', () => {
  const trusted = { learnerId:'l1', level:2, action:'approve_mastery', authenticatedTeacherSession:null };
  assert.throws(()=>routeEngineRequest({ engineCode:'BRILLIANT_TUTOR', trusted, profile:{role:'learner'}, age:10 }), /Teacher approval/);
});
test('Unassigned teacher approval rejected', () => {
  const trusted = { learnerId:'l1', level:2, action:'approve_mastery', authenticatedTeacherSession:{isAuthenticated:true, teacherId:'t1', assignmentVerified:false} };
  assert.throws(()=>routeEngineRequest({ engineCode:'REASONING_MISSIONS', trusted, profile:{role:'teacher'}, age:10 }), /not assigned|Teacher approval/);
});
test('Spoofed teacher session rejected', () => {
  const trusted = { learnerId:'l1', level:2, action:'approve_mastery', authenticatedTeacherSession:{isAuthenticated:false, teacherId:null} };
  assert.throws(()=>routeEngineRequest({ engineCode:'CODING_BUILDER', trusted, profile:{role:'teacher'}, age:10 }), /Teacher approval/);
});
test('Client-supplied action never authorizes mastery via Milo chat', () => {
  const trusted = { learnerId:'l1', level:2, action:'approve_mastery', authenticatedTeacherSession:{isAuthenticated:true, teacherId:'t1', assignmentVerified:true} };
  assert.throws(()=>routeEngineRequest({ engineCode:'REASONING_MISSIONS', trusted, profile:{role:'teacher'}, age:10 }), /use \/api\/teacher\/approve-mastery/);
});
