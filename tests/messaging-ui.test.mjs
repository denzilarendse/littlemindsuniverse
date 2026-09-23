import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('live messaging uses only authorization-aware RPCs',()=>{
  for(const name of ['get_my_message_threads','get_message_contacts','get_or_create_message_thread','get_thread_messages','send_thread_message']){
    assert.ok(app.includes(`rpc('${name}'`),`missing protected RPC ${name}`);
  }
  assert.doesNotMatch(app,/from\('classroom_messages'\)\.insert/);
  assert.doesNotMatch(app,/from\('classroom_message_threads'\)\.insert/);
});

test('learner accounts remain notification-only',()=>{
  assert.match(app,/Learner accounts receive teacher-approved notifications here/);
  assert.match(app,/Learner accounts receive notifications but cannot send messages/);
});

test('live composer is thread-bound, length limited, and duplicate-send guarded',()=>{
  assert.match(app,/maxlength="4000"/);
  assert.match(app,/!state\.activeThreadId/);
  assert.match(app,/button\?\.disabled/);
  assert.match(app,/Message was not sent\. Please try again\./);
});

test('contact IDs remain routing inputs to server authorization',()=>{
  assert.match(app,/data-classroom-id/);
  assert.match(app,/data-learner-id/);
  assert.match(app,/data-guardian-id/);
  assert.match(app,/get_or_create_message_thread/);
});
