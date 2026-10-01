import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Milo specialist studio catalogue covers stages 5-7 capability engines',()=>{
  const code=read('assets/milo-studios.js');
  const sandbox={window:{}};
  vm.runInNewContext(code,sandbox);
  const studios=sandbox.window.LMU_STUDIOS.studios;
  const engines=new Set(studios.map(s=>s.engine));
  for(const engine of ['reasoning_missions','adaptive_practice','voice_language','ai_literacy','coding_ai','brilliant_tutor']){
    assert.ok(engines.has(engine),engine+' missing');
  }
  assert.ok(sandbox.window.LMU_STUDIOS.forAge(4).some(s=>s.engine==='voice_language'));
  assert.ok(sandbox.window.LMU_STUDIOS.forAge(6).some(s=>s.engine==='ai_literacy'));
  assert.ok(!sandbox.window.LMU_STUDIOS.forAge(6).some(s=>s.engine==='coding_ai'));
  assert.ok(sandbox.window.LMU_STUDIOS.forAge(12).some(s=>s.engine==='coding_ai'));
});

test('Reasoning first-attempt and engine preference are sent to server',()=>{
  const app=read('assets/app.js');
  const api=read('api/milo.js');
  assert.match(app,/firstAttemptMade:/);
  assert.match(app,/firstAttemptChars:/);
  assert.match(app,/engine:studio\?\.engine/);
  assert.match(api,/preferredEngine: context\.engine/);
  assert.match(api,/Try the mission first/);
  assert.match(api,/activityType: 'learner_attempt'/);
});

test('Voice recording is consent gated and Android permission is narrow',()=>{
  const app=read('assets/app.js');
  const manifest=read('android/app/src/main/AndroidManifest.xml');
  assert.match(app,/audio_evidence_enabled/);
  assert.match(app,/getUserMedia\(\{audio:true,video:false\}\)/);
  assert.match(app,/create_learner_evidence_item/);
  assert.match(manifest,/android\.permission\.RECORD_AUDIO/);
  for(const permission of ['CAMERA','READ_CONTACTS','WRITE_CONTACTS','ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION']){
    assert.doesNotMatch(manifest,new RegExp('android\\.permission\\.'+permission));
  }
});
