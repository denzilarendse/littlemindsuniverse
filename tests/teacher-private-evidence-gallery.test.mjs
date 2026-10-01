import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('teacher viewer requests only guardian-approved evidence states',()=>{
  const start=app.indexOf('async function loadTeacherSubmissionEvidence');
  const end=app.indexOf('\nfunction openSubmissionReview',start);
  assert.ok(start>=0&&end>start);
  const block=app.slice(start,end);
  assert.match(block,/parent_approved/);
  assert.match(block,/processing/);
  assert.match(block,/milo_analyzed/);
  assert.match(block,/teacher_reviewed/);
  assert.doesNotMatch(block,/pending_parent_approval/);
});

test('teacher viewer downloads approved files from private storage and supports media types',()=>{
  const start=app.indexOf('async function loadTeacherSubmissionEvidence');
  const end=app.indexOf('\nfunction openSubmissionReview',start);
  const block=app.slice(start,end);
  assert.match(block,/storage\s*\n?\s*\.from\('learner-evidence-private'\)\s*\n?\s*\.download\(item\.storage_path\)/);
  assert.match(block,/mime\.startsWith\('image\/'\)/);
  assert.match(block,/mime\.startsWith\('video\/'\)/);
  assert.match(block,/mime\.startsWith\('audio\/'\)/);
  assert.match(block,/Open private attachment/);
  assert.match(block,/URL\.revokeObjectURL/);
  assert.doesNotMatch(block,/getPublicUrl|createSignedUrl/);
});

test('teacher review is held if approved private evidence cannot be inspected',()=>{
  const start=app.indexOf('async function loadTeacherSubmissionEvidence');
  const end=app.indexOf('\nfunction openSubmissionReview',start);
  const block=app.slice(start,end);
  assert.match(block,/approve\.disabled=true/);
  assert.match(block,/Private evidence must load before this review can be approved/);
});
