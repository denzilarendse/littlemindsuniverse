import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
const reports = fs.readFileSync(new URL('../assets/teacher-reports.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const wireStart = app.indexOf('function wire(){');
const wireEnd = app.indexOf('function openAuth(){');
assert.ok(wireStart >= 0 && wireEnd > wireStart, 'wire() boundaries must remain discoverable');
const wire = app.slice(wireStart, wireEnd);

test('every rendered data-action control has an explicit wire binding', () => {
  const actions = [...new Set([...app.matchAll(/data-action="([^"]+)"/g)].map(match => match[1]))].sort();
  assert.deepEqual(actions, [
    'add-managed-learner',
    'auth',
    'create-class',
    'create-lesson',
    'join-classroom',
    'milo-continue-curriculum',
    'milo-finish',
    'milo-read-reply',
    'milo-send',
    'send-message',
    'voice-attach',
    'voice-record'
  ]);
  for (const action of actions) {
    assert.ok(wire.includes(`[data-action="${action}"]`), `missing wire binding for data-action=${action}`);
  }
});

test('dynamic navigation, task, publishing, review and messaging controls are wired', () => {
  for (const selector of [
    '[data-view]',
    '[data-stage]',
    '[data-message-thread]',
    '[data-start-message-contact]',
    '[data-manage-class]',
    '[data-start-task]',
    '[data-approve-rec]',
    '[data-publish-item]',
    '[data-review-submission]'
  ]) {
    assert.ok(wire.includes(selector), `wire() does not bind ${selector}`);
  }
  assert.match(app, /querySelectorAll\('\[data-remove-learner\]'\)/);
  assert.match(app, /querySelectorAll\('\[data-publish-learner\]:checked'\)/);
  assert.match(app, /publishSelectedLearners/);
});

test('signup, signin, recovery, signout and session persistence remain wired', () => {
  assert.match(app, /auth:\{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true\}/);
  assert.match(app, /\$\('#authForm'\)\.onsubmit/);
  assert.match(app, /auth\.signInWithPassword/);
  assert.match(app, /id="authError" role="alert" aria-live="polite" hidden/);
  assert.match(app, /error\.code==='email_provider_disabled'/);
  assert.match(app, /errorBox\.hidden=false/);
  assert.match(app, /\$\('#signUpBtn'\)\.onclick/);
  assert.match(app, /auth\.signUp/);
  assert.match(app, /password\.length<8/);
  assert.match(app, /\$\('#forgotPasswordBtn'\)\.onclick/);
  assert.match(app, /resetPasswordForEmail/);
  assert.match(app, /PASSWORD_RECOVERY/);
  assert.match(app, /auth\.updateUser\(\{password\}\)/);
  assert.match(app, /\$\('#signOutBtn'\)\.onclick/);
  assert.match(app, /auth\.signOut/);
});

test('critical Supabase workflow actions remain connected to protected operations', () => {
  for (const operation of [
    "rpc('create_managed_learner'",
    "rpc('join_classroom_by_code'",
    "rpc('create_teacher_draft_with_skill'",
    "rpc('save_learner_work'",
    "rpc('review_learner_submission'",
    "rpc('approve_milo_recommendation'",
    "rpc('record_milo_learning_event'"
  ]) {
    assert.ok(app.includes(operation), `missing protected workflow operation: ${operation}`);
  }
});

test('canonical user-facing application copy is Connect-only', () => {
  assert.doesNotMatch(app, /WhatsApp/i);
  assert.doesNotMatch(reports, /WhatsApp/i);
  assert.match(app, /LittleMinds Connect/);
  assert.match(html, /\/assets\/connect-bridge\.js/);
});
