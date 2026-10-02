import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'database/migrations/20261001_transactional_teacher_publish_and_privacy_deny.sql'),'utf8');

test('teacher publishing uses one transactional RPC',()=>{
  assert.match(app,/rpc\('publish_teacher_learning_item'/);
  assert.doesNotMatch(app,/from\('learning_item_recipients'\)\.upsert/);
  assert.doesNotMatch(app,/from\('learning_items'\)\.update\(\{status:'published'/);
});

test('publish RPC validates ownership, active membership and mapped skill',()=>{
  assert.match(migration,/teacher_owns_classroom/);
  assert.match(migration,/cm\.status = 'active'/);
  assert.match(migration,/l\.active = true/);
  assert.match(migration,/learning_item_skills/);
  assert.match(migration,/for update/);
});

test('privacy requests have an explicit direct-client deny policy',()=>{
  assert.match(migration,/privacy_requests_no_direct_client_access/);
  assert.match(migration,/to anon, authenticated/);
  assert.match(migration,/using \(false\)/);
  assert.match(migration,/with check \(false\)/);
});

test('canonical classroom messaging copy is in-app only',()=>{
  assert.doesNotMatch(app,/external phone-number messaging provider/i);
  assert.match(app,/LittleMinds Connect/);
});
