import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Early Learning World is loaded, cached and wired into the learner experience',()=>{
  const html=read('index.html');
  const sw=read('sw.js');
  const app=read('assets/app.js');
  assert.match(html,/\/assets\/early-learning\.js/);
  assert.match(sw,/\/assets\/early-learning\.js/);
  assert.match(app,/Milo Early Learning World/);
  assert.match(app,/data-early-activity/);
  assert.match(app,/speechSynthesis/);
  assert.match(app,/get_early_learning_summary/);
});

test('Early Learning catalogue is original, bounded to ages 2-5 and offers varied modalities',()=>{
  const code=read('assets/early-learning.js');
  const sandbox={window:{}};
  vm.runInNewContext(code,sandbox);
  const activities=sandbox.window.LMU_EARLY.activities;
  assert.ok(activities.length>=6);
  assert.ok(activities.every(a=>a.ages[0]>=2&&a.ages[1]<=5));
  assert.ok(activities.some(a=>a.engine==='play_story'));
  assert.ok(activities.some(a=>a.engine==='early_learning'));
  assert.ok(new Set(activities.map(a=>a.subject)).size>=3);
  assert.ok(activities.every(a=>a.prompt.length<350));
});

test('Stage 4 does not add camera, microphone, contact or location permissions',()=>{
  const manifest=read('android/app/src/main/AndroidManifest.xml');
  for(const permission of ['CAMERA','RECORD_AUDIO','READ_CONTACTS','WRITE_CONTACTS','ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION']){
    assert.doesNotMatch(manifest,new RegExp('android\\.permission\\.'+permission));
  }
});

test('Early Learning UI has large touch targets and reduced-motion handling',()=>{
  const css=read('assets/app.css');
  assert.match(css,/\.early-listen[\s\S]*min-height:64px/);
  assert.match(css,/\.early-activity[\s\S]*min-height:190px/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
