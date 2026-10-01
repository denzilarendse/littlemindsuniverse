import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/app.css',import.meta.url),'utf8');

test('learner workspace exposes camera video mic and attachment controls',()=>{
  for(const id of ['captureCamera','captureVideo','captureAudio','captureAttach']){
    assert.match(app,new RegExp(`id="${id}"`));
  }
  assert.match(app,/capture="environment"/);
  assert.match(app,/accept="audio\/\*"/);
  assert.match(css,/\.lmu-evidence-capture/);
});

test('camera video and audio unlock only from server-derived guardian consent status',()=>{
  assert.match(app,/rpc\('get_learner_evidence_capture_status'/);
  assert.match(app,/model\.status\.camera_enabled/);
  assert.match(app,/model\.status\.video_enabled/);
  assert.match(app,/model\.status\.audio_evidence_enabled/);
  assert.match(app,/Camera, video and microphone stay locked until LMU can verify guardian consent/);
});

test('captured evidence uploads only to private storage and registers through the governed RPC',()=>{
  const start=app.indexOf('function initLearnerEvidenceTools');
  const end=app.indexOf('\n\nfunction whiteboardStorageKey',start);
  assert.ok(start>=0&&end>start);
  const block=app.slice(start,end);
  assert.match(block,/storage\.from\('learner-evidence-private'\)/);
  assert.match(block,/rpc\('create_learner_evidence_item'/);
  assert.match(block,/upsert:false/);
  assert.match(block,/bucket\.remove\(\[storagePath\]\)/);
  assert.doesNotMatch(block,/getPublicUrl|createSignedUrl|service_role/i);
});

test('video duration is read before registration and checked against the server policy limit',()=>{
  assert.match(app,/function evidenceMediaDuration/);
  assert.match(app,/video_max_capture_seconds/);
  assert.match(app,/Video evidence must be \$\{max\} seconds or shorter/);
  assert.match(app,/p_duration_seconds:duration/);
});

test('final learner submission accepts already-registered private media evidence',()=>{
  assert.match(app,/const hasMedia=!!media\?\.items\?\.length/);
  assert.match(app,/Learner submitted private evidence/);
  assert.match(app,/Guardian-approved media will become available for teacher review/);
  assert.match(app,/rpc\('save_learner_work'/);
});
