import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Coding Studio uses a bounded isolated worker and disables network primitives',()=>{
  const code=read('assets/coding-studio.js');
  assert.match(code,/new Worker\(/);
  assert.match(code,/self\.fetch=undefined/);
  assert.match(code,/self\.XMLHttpRequest=undefined/);
  assert.match(code,/self\.WebSocket=undefined/);
  assert.match(code,/self\.importScripts=undefined/);
  assert.match(code,/worker\.terminate\(\)/);
  assert.match(code,/Program stopped because it ran too long/);
  assert.doesNotMatch(code,/navigator\.geolocation/);
});

test('Coding evidence uses private storage and governed document evidence',()=>{
  const app=read('assets/app.js');
  assert.match(app,/learner-evidence-private/);
  assert.match(app,/p_evidence_type:'document'/);
  assert.match(app,/Guardian approval may be required/);
  assert.match(app,/Milo may explain and debug with you/);
});
