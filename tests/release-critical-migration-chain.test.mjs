import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');

const required=[
  'database/migrations/20260928203851_privacy_account_request_queue.sql',
  'database/migrations/20261001133049_evidence_capture_status_verified_guardian.sql',
  'database/migrations/20261001133455_validate_private_media_evidence.sql',
  'database/migrations/20261001134031_block_review_while_guardian_evidence_pending.sql',
  'database/migrations/20261001_fix_account_removal_status_ambiguity.sql'
];

test('release-critical privacy and evidence migration chain is present in source',()=>{
  for(const path of required){
    assert.equal(fs.existsSync(new URL(path,root)),true,`missing release-critical migration ${path}`);
  }
});

test('privacy queue is created before the account-removal ambiguity repair contract',()=>{
  const base=read(required[0]);
  const repair=read(required[4]);
  assert.match(base,/create table if not exists public\.privacy_requests/i);
  assert.match(base,/revoke all on table public\.privacy_requests from anon, authenticated/i);
  assert.match(base,/grant execute on function public\.request_account_removal\(text\) to authenticated/i);
  assert.match(repair,/insert into public\.privacy_requests as pr/i);
  assert.match(repair,/pr\.status\s+in\s*\('pending','processing'\)/i);
});

test('evidence chain keeps guardian authorization, private-media validation and review blocking',()=>{
  const guardian=read(required[1]);
  const media=read(required[2]);
  const block=read(required[3]);
  assert.match(guardian,/auth\.uid\(\)/i);
  assert.match(guardian,/guardian/i);
  assert.match(media,/evidence/i);
  assert.match(media,/storage|mime|media/i);
  assert.match(block,/review/i);
  assert.match(block,/pending/i);
});

test('repository documents that migrations are deltas, not a complete empty-database bootstrap',()=>{
  const parity=read('docs/LIVE-MIGRATION-PARITY-20261003.md');
  assert.match(parity,/delta-migration package/i);
  assert.match(parity,/not a complete zero-to-one bootstrap/i);
  assert.match(parity,/Do not claim/i);
});
