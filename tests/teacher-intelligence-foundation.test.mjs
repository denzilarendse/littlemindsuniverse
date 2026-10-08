import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'database/migrations/20261008_teacher_intelligence_foundation.sql'),'utf8');

test('Phase 1A creates a teacher intelligence signal contract without autonomous decisions',()=>{
  assert.match(migration,/create table if not exists public\.teacher_intelligence_signals/i);
  assert.match(migration,/signal_type in \('individual','group','class','change','enrichment'\)/i);
  assert.match(migration,/confidence in \('low','medium','high'\)/i);
  assert.match(migration,/contradictory_evidence jsonb/i);
  assert.match(migration,/status text not null default 'proposed'/i);
  assert.doesNotMatch(migration,/diagnos(e|is|tic)/i);
});

test('signal membership supports overlapping learners with evidence provenance',()=>{
  assert.match(migration,/create table if not exists public\.teacher_intelligence_signal_learners/i);
  assert.match(migration,/primary key\(signal_id, learner_id\)/i);
  assert.match(migration,/independent_evidence_count/i);
  assert.match(migration,/assisted_evidence_count/i);
  assert.match(migration,/misconception_count/i);
  assert.match(migration,/inclusion_reason/i);
});

test('teacher intelligence reads are teacher-owned and direct table access is denied',()=>{
  assert.match(migration,/teacher_owns_classroom\(p_classroom_id\)/i);
  assert.match(migration,/revoke all on public\.teacher_intelligence_signals from anon, authenticated/i);
  assert.match(migration,/revoke all on public\.teacher_intelligence_signal_learners from anon, authenticated/i);
  assert.match(migration,/grant execute on function public\.get_teacher_intelligence_overview\(uuid\) to authenticated/i);
  assert.match(migration,/grant execute on function public\.get_teacher_intelligence_signals\(uuid\) to authenticated/i);
});

test('teacher home consumes the governed Phase 1A overview rather than raw signal tables',()=>{
  assert.match(app,/rpc\('get_teacher_intelligence_overview'/);
  assert.match(app,/teacherIntelligenceOverviews/);
  assert.match(app,/Learners needing attention/);
  assert.match(app,/Evidence waiting review/);
  assert.match(app,/Active support groups/);
  assert.doesNotMatch(app,/from\('teacher_intelligence_signals'\)/);
});
