import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('sign-in popup exposes role context without trusting the client for authorization',()=>{
  assert.match(app,/id="authLoginRole"/);
  assert.match(app,/This selector does not grant a role/);
  assert.match(app,/signInWithPassword\(\{email:\$\('#authEmail'\)\.value,password:\$\('#authPassword'\)\.value\}\)/);
  assert.doesNotMatch(app,/signInWithPassword\(\{[^}]*role:/);
});

test('sign-in and password recovery include accessible show-hide controls',()=>{
  assert.match(app,/id="togglePasswordBtn" aria-pressed="false">Show password/);
  assert.match(app,/id="toggleRecoveryPasswordBtn" aria-pressed="false">Show passwords/);
  assert.match(app,/input\.type=showing\?'password':'text'/);
  assert.match(app,/button\.setAttribute\('aria-pressed',String\(!showing\)\)/);
});

test('password recovery keeps generic anti-enumeration messaging',()=>{
  assert.match(app,/If the account exists, check your email for a password-reset link/);
});
