import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../database/migrations/20261001_validate_private_media_evidence.sql',import.meta.url),'utf8');

test('private learner media validation is a non-exposed trigger function',()=>{
  assert.match(migration,/security invoker/i);
  assert.match(migration,/revoke all on function public\.validate_learner_evidence_media_row\(\) from public, anon, authenticated, service_role/i);
  assert.match(migration,/before insert or update of evidence_type, storage_path, mime_type, file_size_bytes, duration_seconds/i);
});

test('media validation enforces type and video duration server-side',()=>{
  assert.match(migration,/photo[\s\S]*image\/%/i);
  assert.match(migration,/video[\s\S]*video\/%/i);
  assert.match(migration,/audio[\s\S]*audio\/%/i);
  assert.match(migration,/Video evidence duration is required/);
  assert.match(migration,/policy_key='video_evidence'/);
  assert.match(migration,/new\.duration_seconds > v_max_seconds/);
});

test('media validation keeps the 25 MB private evidence limit',()=>{
  assert.match(migration,/26214400/);
  assert.match(migration,/Evidence file exceeds the 25 MB private storage limit/);
});
