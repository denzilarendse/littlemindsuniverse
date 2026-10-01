import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('whiteboard persistence uses one deterministic private object per learner assignment',()=>{
  assert.match(app,/\$\{learnerId\}\/whiteboard\/\$\{safeItem\}\/current\.png/);
  assert.match(app,/bucket\.upload\(path,blob,\{contentType:'image\/png',cacheControl:'3600',upsert:true\}\)/);
  assert.doesNotMatch(app,/whiteboard\/\$\{safeItem\}\/\$\{stamp\}\.png/);
});

test('whiteboard retry does not delete the deterministic object when evidence registration fails',()=>{
  const start=app.indexOf('async function persistWhiteboardEvidence');
  const end=app.indexOf('\n\nasync function submitEvidence',start);
  assert.ok(start>=0&&end>start);
  const block=app.slice(start,end);
  assert.match(block,/deterministic private object retained for safe retry/);
  assert.doesNotMatch(block,/bucket\.remove/);
});

test('whiteboard persistence stays private and registers through the governed evidence RPC',()=>{
  assert.match(app,/storage\.from\('learner-evidence-private'\)/);
  assert.match(app,/rpc\('create_learner_evidence_item'/);
  assert.doesNotMatch(app,/getPublicUrl|createSignedUrl/);
});
