import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const controls = read('assets/parent-controls.js');
const html = read('index.html');
const sw = read('sw.js');

test('parent controls load before the main app and share the same Supabase client', () => {
  const controlsIndex=html.indexOf('/assets/parent-controls.js');
  const appIndex=html.indexOf('/assets/app.js');
  assert.ok(controlsIndex>=0 && appIndex>controlsIndex);
  assert.match(controls, /window\.supabase\.createClient=\(\.\.\.args\)=>/);
  assert.match(controls, /if\(!client\)client=created/);
});

test('parent controls use only the protected parent and guardian RPCs', () => {
  for (const name of [
    'get_guardian_evidence_permissions',
    'get_parent_notification_preferences',
    'get_learner_device_feature_status',
    'set_guardian_child_facing_identity',
    'set_guardian_feature_control',
    'set_guardian_evidence_consent',
    'set_parent_notification_preferences',
    'set_parent_whatsapp_contact'
  ]) assert.match(controls, new RegExp(name));
  assert.match(controls, /profile\.role!=='parent'/);
});

test('parent consent is distinct from browser or operating-system hardware permission', () => {
  assert.match(controls, /phone or browser must still separately grant camera or microphone hardware access/);
  assert.match(controls, /LMU never treats database consent as device permission/);
  assert.doesNotMatch(controls, /getUserMedia\s*\(/);
});

test('consent history is read through guardian-scoped RLS data', () => {
  assert.match(controls, /from\('guardian_consent_receipts'\)/);
  assert.match(controls, /\.eq\('learner_id',learnerId\)/);
  assert.match(controls, /policy_version_snapshot/);
});

test('evidence consent requires explicit agreement before enabling', () => {
  assert.match(controls, /I have read this policy and agree to enable this feature for this learner/);
  assert.match(controls, /Agree & enable/);
  assert.match(controls, /Revoke permission/);
});

test('WhatsApp preference is stored separately from provider delivery', () => {
  assert.match(controls, /Provider delivery remains separate and starts only when the LittleMindsUniverse WhatsApp Business integration is active/);
  assert.match(controls, /\^\\\+\[1-9\]\[0-9\]\{7,14\}\$/);
});

test('parent controls are part of the offline app shell', () => {
  assert.match(sw, /lmu-production-v\d+/);
  assert.match(sw, /\/assets\/parent-controls\.js/);
});
