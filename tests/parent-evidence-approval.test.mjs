import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const controls=fs.readFileSync(new URL('../assets/parent-controls.js',import.meta.url),'utf8');

test('parent controls load pending evidence through the guarded RPC',()=>{
  assert.match(controls,/client\.rpc\('get_guardian_pending_evidence'\)/);
  assert.match(controls,/pendingEvidence:\[\]/);
  assert.match(controls,/data-review-pending-evidence/);
});

test('guardian review downloads private evidence without public or signed URLs',()=>{
  assert.match(controls,/storage\.from\('learner-evidence-private'\)\.download\(row\.storage_path\)/);
  assert.match(controls,/URL\.createObjectURL/);
  assert.match(controls,/URL\.revokeObjectURL/);
  assert.doesNotMatch(controls,/getPublicUrl|createSignedUrl/);
});

test('pending evidence remains explicitly parent-gated and decisions use the reviewed RPC',()=>{
  assert.match(controls,/Pending child media remains private from teachers and Milo until an authorized guardian approves it/);
  assert.match(controls,/client\.rpc\('decide_learner_evidence'/);
  assert.match(controls,/p_approve:approve/);
  assert.match(controls,/Evidence approved for authorized teacher review/);
  assert.match(controls,/Evidence rejected and queued for deletion/);
});

test('approval is disabled if the private preview cannot be loaded',()=>{
  const start=controls.indexOf('async function openPendingEvidenceReview');
  assert.ok(start>=0);
  const block=controls.slice(start,controls.indexOf('\n  function canMutate',start));
  assert.match(block,/pendingEvidenceApprove'\)\.disabled=true/);
});
