import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../database/migrations/20261001_evidence_capture_status_verified_guardian.sql',import.meta.url),'utf8');

test('capture status exposes video consent and server-derived capture limits',()=>{
  assert.match(migration,/get_learner_evidence_capture_status/);
  assert.match(migration,/video_enabled boolean/);
  assert.match(migration,/video_max_capture_seconds integer/);
  assert.match(migration,/consent_type='video_evidence'/);
  assert.match(migration,/policy_key='video_evidence'/);
});

test('guardian evidence consent and approval paths require verified relationships',()=>{
  for(const fn of ['set_guardian_evidence_consent','get_guardian_pending_evidence','decide_learner_evidence']){
    const start=migration.indexOf(`function public.${fn}`);
    assert.ok(start>=0,`missing ${fn}`);
    const next=migration.indexOf('create or replace function public.',start+20);
    const block=migration.slice(start,next>=0?next:undefined);
    assert.match(block,/gl\.verified\s*=\s*true/,`${fn} must require verified guardian relationship`);
  }
});

test('new and hardened evidence RPCs are not executable by anon or PUBLIC',()=>{
  assert.match(migration,/revoke all on function public\.get_learner_evidence_capture_status\(uuid\) from public, anon/);
  assert.match(migration,/grant execute on function public\.get_learner_evidence_capture_status\(uuid\) to authenticated/);
  assert.match(migration,/revoke all on function public\.set_guardian_evidence_consent\(uuid,text,uuid,boolean\) from public, anon/);
  assert.match(migration,/revoke all on function public\.get_guardian_pending_evidence\(\) from public, anon/);
  assert.match(migration,/revoke all on function public\.decide_learner_evidence\(uuid,boolean,text\) from public, anon/);
});
