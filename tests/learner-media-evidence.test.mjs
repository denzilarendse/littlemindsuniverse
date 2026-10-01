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

test('learner submission waits for guardian decision and accepts only approved media',()=>{
  assert.match(app,/hasPending:\(\)=>model\.items\.some\(item=>item\.status==='pending_parent_approval'\)/);
  assert.match(app,/hasApproved:\(\)=>model\.items\.some/);
  assert.match(app,/Private media is waiting for guardian approval\. Submit after the guardian decision/);
  assert.match(app,/Learner submitted guardian-approved private evidence/);
  assert.match(app,/Guardian-approved evidence submitted privately for teacher review/);
  assert.match(app,/rpc\('save_learner_work'/);
});

test('existing private evidence state is restored when the learner reopens the task',()=>{
  assert.match(app,/from\('learner_submissions'\)/);
  assert.match(app,/from\('learner_evidence_items'\)/);
  assert.match(app,/loadExistingEvidence/);
  assert.match(app,/parent_approved/);
});
