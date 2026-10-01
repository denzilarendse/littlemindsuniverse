import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/app.css',import.meta.url),'utf8');

test('sign-in asks for a role but verifies that role against the authenticated profile',()=>{
  assert.match(app,/id="authRole"/);
  assert.match(app,/Sign in as/);
  assert.match(app,/\.from\('profiles'\)[\s\S]{0,220}\.select\('role'\)/);
  assert.match(app,/profile\.role!==selectedRole/);
  assert.match(app,/choosing a role never grants permissions/i);
  assert.match(app,/await state\.supabase\.auth\.signOut\(\)/);
});

test('password fields have accessible show and hide controls',()=>{
  assert.match(app,/function wirePasswordVisibility/);
  assert.match(app,/authPasswordToggle/);
  assert.match(app,/newPasswordToggle/);
  assert.match(app,/confirmPasswordToggle/);
  assert.match(app,/aria-pressed/);
  assert.match(app,/aria-label="Show password"/);
  assert.match(css,/\.password-field-row/);
});

test('password recovery response is enumeration-resistant',()=>{
  assert.match(app,/If the account exists, check your email for a password-reset link/);
  const recoveryStart=app.indexOf("$('#forgotPasswordBtn').onclick");
  const recoveryEnd=app.indexOf('\n  };',recoveryStart);
  assert.ok(recoveryStart>=0&&recoveryEnd>recoveryStart);
  const block=app.slice(recoveryStart,recoveryEnd);
  assert.doesNotMatch(block,/toast\(error\?error\.message/);
});

test('sign-in errors do not expose raw provider messages and retain rate-limit feedback',()=>{
  const start=app.indexOf("$('#authForm').onsubmit");
  const end=app.indexOf("\n\n  $('#signUpBtn')",start);
  assert.ok(start>=0&&end>start);
  const block=app.slice(start,end);
  assert.match(block,/Too many sign-in attempts/);
  assert.match(block,/Sign-in details could not be verified/);
  assert.doesNotMatch(block,/toast\(error\.message/);
});
