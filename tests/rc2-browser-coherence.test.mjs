import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { selectMiloEngine } from '../api/_lib/milo-orchestrator.js';

const root=new URL('../',import.meta.url);
const app=fs.readFileSync(new URL('assets/app.js',root),'utf8');
const studiosCode=fs.readFileSync(new URL('assets/milo-studios.js',root),'utf8');
const runtimeConfig=fs.readFileSync(new URL('assets/runtime-config.js',root),'utf8');
const httpLib=fs.readFileSync(new URL('api/_lib/http.js',root),'utf8');

test('Milo specialist cards map to distinct engines and Coding opens its dedicated studio',()=>{
  const sandbox={window:{}};
  vm.runInNewContext(studiosCode,sandbox);
  const studios=sandbox.window.LMU_STUDIOS.studios;
  const byId=new Map(studios.map(row=>[row.id,row.engine]));
  assert.equal(byId.get('ai-literacy'),'ai_literacy');
  assert.equal(byId.get('coding-ai'),'coding_ai');
  assert.equal(byId.get('brilliant-milo'),'brilliant_tutor');
  assert.equal(new Set(studios.map(row=>row.id)).size,studios.length);
  assert.match(app,/if\(id==='coding-ai'\)return openCodingStudio\(\)/);
  assert.match(app,/engine:studio\?\.engine\|\|null/);
});

test('server honors a valid selected specialist engine over keyword classification',()=>{
  assert.equal(selectMiloEngine({
    stageCode:'DB810',
    message:'Teach me about AI bias',
    preferredEngine:'coding_ai'
  }),'coding_ai');
  assert.equal(selectMiloEngine({
    stageCode:'CA1113',
    message:'Help debug this JavaScript loop',
    preferredEngine:'ai_literacy'
  }),'ai_literacy');
  assert.equal(selectMiloEngine({
    stageCode:'PA1415',
    message:'Explain machine learning',
    preferredEngine:'brilliant_tutor'
  }),'brilliant_tutor');
});

test('Milo client hides internal details for server-side 5xx responses',()=>{
  assert.match(app,/res\.status>=500\?'Milo unavailable'/);
  assert.match(app,/Milo could not connect just now\. Please try again in a moment\./);
});


test('Android Milo routes to the canonical hosted API instead of Capacitor localhost',()=>{
  assert.match(runtimeConfig,/publicAppUrl:\s*'https:\/\/www\.littlemindsuniverse\.co\.za'/);
  assert.match(app,/function miloApiUrl\(\)/);
  assert.match(app,/origin==='https:\/\/localhost'\|\|origin==='capacitor:\/\/localhost'/);
  assert.match(app,/return publicBase\+'\/api\/milo'/);
  assert.match(app,/fetch\(miloApiUrl\(\)/);
  assert.match(httpLib,/values\.add\('https:\/\/localhost'\)/);
  assert.match(httpLib,/values\.add\('capacitor:\/\/localhost'\)/);
});

test('Milo cards start non-reasoning specialist sessions and non-JSON API responses are sanitized',()=>{
  assert.match(app,/if\(studio\.engine!=='reasoning_missions'\)setTimeout\(\(\)=>sendMilo\(\),0\)/);
  assert.match(app,/const raw=await res\.text\(\);let body=null;try\{body=JSON\.parse\(raw\)\}/);
  assert.match(app,/Milo API returned non-JSON content/);
});
