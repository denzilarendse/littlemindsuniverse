import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('parent dashboard loads and switches multiple verified learners',()=>{
  assert.match(app,/guardian_learner_links.*limit\(20\)/s);
  assert.match(app,/id="parentLearnerPicker"/);
  assert.match(app,/async function selectParentLearner/);
  assert.match(app,/state\.learners=/);
});

test('parent onboarding uses protected managed learner RPC',()=>{
  assert.match(app,/rpc\('create_managed_learner'/);
  assert.match(app,/Family onboarding/);
  assert.match(app,/data-action="add-managed-learner"/);
});

test('self-service signup cannot silently elevate or misclassify teacher and learner roles',()=>{
  assert.match(app,/Teacher or tutor registration requires verification. No account was created./);
  assert.match(app,/A parent or guardian creates and manages the learner profile. No account was created./);
  assert.match(app,/New self-service accounts are parent\/guardian accounts/);
  assert.doesNotMatch(app,/lmu_role/);
});

test('password recovery uses supported Supabase client flow',()=>{
  assert.match(app,/resetPasswordForEmail/);
  assert.match(app,/PASSWORD_RECOVERY/);
  assert.match(app,/auth\.updateUser\(\{password\}\)/);
});

test('admin does not fall through into learner submission UI',()=>{
  assert.match(app,/if\(state\.role==='admin'\)return .*Administrative learning view/);
  assert.match(app,/Admin accounts do not inherit learner or teacher permissions/);
});

test('high-risk async controls have duplicate-submit guards',()=>{
  assert.match(app,/createLesson\(\).*button\?\.disabled/s);
  assert.match(app,/approveRecommendation\(id\).*button\?\.disabled/s);
  assert.match(app,/id="signInBtn"/);
  assert.match(app,/id="signUpBtn"/);
});
