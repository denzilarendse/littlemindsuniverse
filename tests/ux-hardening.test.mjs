import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = read('assets/app.js');
const html = read('index.html');
const css = read('assets/app.css');
const build = read('scripts/build.mjs');

test('live mode clears demo collections before loading trusted data', () => {
  assert.match(app, /state\.tasks=\[\];state\.mastery=\[\];state\.recommendations=\[\];state\.teacherSubmissions=\[\];state\.teacherSkills=\[\];state\.reports=\[\];state\.classrooms=\[\];state\.messages=\[\]/);
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
