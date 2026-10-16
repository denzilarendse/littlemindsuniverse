import test from 'node:test';import assert from 'node:assert/strict';
import {detectGroupedSignals} from '../backend/services/teacher-intelligence-grouped.mjs';
const r=(learnerId,id,judgement='not_yet',misconception='wrong denominator')=>({classroomId:'c',learnerId,skillId:'s',evidenceId:id,judgement,misconception,observedAt:'2026-10-08T01:00:00Z',teacherReviewed:true,reviewAuthorized:true,independentEvidence:true});
const run=(ids,rows)=>detectGroupedSignals({classroomId:'c',activeLearnerIds:ids,evidenceRows:rows});
test('no evidence does not invent a group',()=>assert.equal(run(['a'],[]).candidates.length,0));
test('two learners same misconception produce proposal only',()=>{const x=run(['a','b'],[r('a','1'),r('b','2')]);const g=x.candidates.find(y=>y.signalType==='group');assert.equal(g.members.length,2);assert.equal(g.status,'proposed');});
test('cross-classroom and unreviewed evidence excluded',()=>{const a=r('a','1');a.classroomId='other';const b=r('a','2');b.teacherReviewed=false;assert.equal(run(['a'],[a,b]).reviewedEvidenceCount,0)});
test('one learner cannot trigger class signal',()=>assert.equal(run(['a'],[r('a','1')]).candidates.some(x=>x.signalType==='class'),false));
test('contradiction preserved for strength',()=>{const a=r('a','1');a.observedAt='2026-10-07T01:00:00Z';const b=r('a','2','strong');const x=run(['a'],[a,b]);assert.deepEqual(x.candidates.find(y=>y.signalType==='enrichment').members[0].contradictoryEvidenceIds,['1']);});
