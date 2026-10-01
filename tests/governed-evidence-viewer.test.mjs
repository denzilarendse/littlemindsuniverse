import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');

test('assigned learner work can open governed voice and coding tools',()=>{
  assert.match(app,/id="taskVoice"/);
  assert.match(app,/id="taskCode"/);
  assert.match(app,/state\.miloLearningItemId=t\.id;state\.miloStudioId='voice-language'/);
  assert.match(app,/state\.miloLearningItemId=t\.id;state\.miloStudioId='coding-ai'/);
});

test('teacher evidence reviewer supports approved whiteboard image, audio, video and text code',()=>{
  assert.match(app,/evidence_type,status,storage_path,mime_type,file_size_bytes,duration_seconds,transcript_text/);
  assert.match(app,/type==='audio'\|\|mime\.startsWith\('audio\/'\)/);
  assert.match(app,/type==='video'\|\|mime\.startsWith\('video\/'\)/);
  assert.match(app,/type==='document'.*application\/javascript/s);
  assert.match(app,/blob\.text\(\)/);
  assert.match(app,/Preview truncated to 12,000 characters/);
});

test('teacher review only queries approved or reviewable evidence states',()=>{
  assert.match(app,/\.in\('status',\['parent_approved','processing','milo_analyzed','teacher_reviewed'\]\)/);
  assert.doesNotMatch(app,/\.in\('status',\[[^\]]*'pending_parent_approval'/);
});

test('private evidence viewer does not create public or signed URLs',()=>{
  const viewer=app.slice(app.indexOf('async function loadTeacherSubmissionEvidence'),app.indexOf('function openSubmissionReview'));
  assert.match(viewer,/learner-evidence-private/);
  assert.match(viewer,/\.download\(item\.storage_path\)/);
  assert.doesNotMatch(viewer,/getPublicUrl|createSignedUrl/);
});
