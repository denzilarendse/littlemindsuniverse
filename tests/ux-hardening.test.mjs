import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = read('assets/app.js');
const html = read('index.html');
const css = read('assets/app.css');
const build = read('scripts/build.mjs');

test('live mode clears demo collections before loading trusted data', () => {
  assert.match(app, /state\.tasks=\[\];state\.mastery=\[\];state\.recommendations=\[\];state\.teacherSubmissions=\[\];state\.teacherSkills=\[\];state\.reports=\[\];state\.earlySummary=null;state\.classrooms=\[\];state\.messages=\[\]/);
  assert.match(app, /function demoReset\(\).*state\.chat=\[\].*state\.miloLearningItemId=null/s);
});

test('Milo preserves selected help level and blocks duplicate sends while pending', () => {
  assert.match(app, /miloHelpLevel:2,miloPending:false/);
  assert.match(app, /const requestedLevel=Number\(\$\('#miloHelp'\).*?state\.miloHelpLevel/s);
  assert.match(app, /helpLevel:state\.miloHelpLevel/);
  assert.match(app, /if\(state\.miloPending\)return/);
  assert.match(app, /Milo is thinking…/);
});

test('learner messaging is notification-only and live messaging never fakes delivery', () => {
  assert.match(app, /Learner accounts receive teacher-approved notifications here/);
  assert.match(app, /Learner accounts receive notifications but cannot send messages/);
  assert.match(app, /rpc\('send_thread_message'/);
  assert.match(app, /Message was not sent\. Please try again\./);
  assert.match(app, /Demo message added on this device/);
  assert.doesNotMatch(app, /toast\('Message added'\)/);
});

test('language and navigation state survive rerender visibly', () => {
  assert.match(app, /languagePicker\.value=state\.language/);
  assert.match(app, /aria-current=/);
  assert.match(app, /document\.querySelector\(`\[data-view=/);
});

test('accessibility announcements are scoped and mobile controls have visible focus and touch size', () => {
  assert.doesNotMatch(html, /id="app" aria-live=/);
  assert.match(html, /id="toast" class="toast" role="status"/);
  assert.match(app, /id="chatBox" aria-live="polite"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:44px/);
});

test('production secret scanner includes Groq', () => {
  assert.match(build, /GROQ_API_KEY/);
});


test('live learning stage cards are profile-derived and cannot switch the active stage', () => {
  assert.match(app, /function stagePicker\(\)\{const interactive=state\.mode===['"]demo['"]/);
  assert.match(app, /interactive\?\`data-stage=/);
  assert.match(app, /disabled aria-disabled="true"/);
  assert.match(app, /state\.mode===['"]demo['"]\?'Choose learning stage':'Learning stage'/);
});

test('parent home exposes the authorization controls entry point', () => {
  assert.match(app, /data-view="settings">Parent authorization<\/button>/);
});


test('submitted learner work cannot regress to Continue when recipient state lags', () => {
  assert.match(app, /function resolveLearnerWorkflowStatus\(recipientStatus,submissionStatus\).*recipientStatus==='reviewed'.*submissionStatus==='submitted'.*return recipientStatus\|\|'assigned'/s);
  assert.match(app, /from\('learner_submissions'\)\.select\('learning_item_id,status'\)\.eq\('learner_id',learnerId\)/);
  assert.match(app, /submissionStatusByItem=new Map/);
  assert.match(app, /recipient_status:resolveLearnerWorkflowStatus\(r\.status,submissionStatus\)/);
});


test('live server-backed learning views refresh authoritative role data on navigation', () => {
  assert.match(app, /const roleRefreshViews=new Set\(\['learning','mastery','reports'\]\)/);
  assert.match(app, /document\.querySelectorAll\('\[data-view\]'\)\.forEach\(b=>b\.onclick=async\(\)=>/);
  assert.match(app, /state\.mode==='live'&&roleRefreshViews\.has\(view\)\)\{await loadRoleData\(\);if\(state\.view===view\)render\(\)\}/);
});
