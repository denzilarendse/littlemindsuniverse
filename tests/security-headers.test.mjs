import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const vercel = JSON.parse(read('vercel.json'));
const netlify = read('netlify.toml');
const artifactHeaders = read('_headers');
const buildScript = read('scripts/build.mjs');

const vercelHeaders = Object.fromEntries(vercel.headers[0].headers.map(({ key, value }) => [key, value]));
const csp = vercelHeaders['Content-Security-Policy'];

const requiredNetlifyFragments = [
  'Content-Security-Policy',
  "default-src 'self'",
  "object-src 'none'",
  'https://cdn.jsdelivr.net',
  'https://zcokxljcsfkrlouzragv.supabase.co',
  'wss://zcokxljcsfkrlouzragv.supabase.co',
  'https://www.payfast.co.za',
  'Cross-Origin-Opener-Policy',
  'X-Permitted-Cross-Domain-Policies',
  'Strict-Transport-Security'
];

test('Vercel ships a restrictive CSP for the static app and Connect', () => {
  assert.ok(csp, 'Content-Security-Policy header is required');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.match(csp, /script-src 'self' https:\/\/cdn\.jsdelivr\.net/);
  assert.match(csp, /connect-src 'self' https:\/\/zcokxljcsfkrlouzragv\.supabase\.co wss:\/\/zcokxljcsfkrlouzragv\.supabase\.co/);
  assert.match(csp, /form-action 'self' https:\/\/www\.payfast\.co\.za https:\/\/sandbox\.payfast\.co\.za/);
  assert.doesNotMatch(csp, /unsafe-eval|default-src \*/i);
});

test('Vercel adds transport and browser-isolation hardening', () => {
  assert.equal(vercelHeaders['X-Content-Type-Options'], 'nosniff');
  assert.equal(vercelHeaders['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(vercelHeaders['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.equal(vercelHeaders['X-Permitted-Cross-Domain-Policies'], 'none');
  assert.match(vercelHeaders['Strict-Transport-Security'], /^max-age=\d+/);
});

test('Netlify repository configuration mirrors the same security policy', () => {
  for (const fragment of requiredNetlifyFragments) {
    assert.ok(netlify.includes(fragment), `Netlify security headers missing: ${fragment}`);
  }
  assert.match(netlify, /Cross-Origin-Opener-Policy\s*=\s*"same-origin"/);
  assert.match(netlify, /X-Permitted-Cross-Domain-Policies\s*=\s*"none"/);
  assert.match(netlify, /Strict-Transport-Security\s*=\s*"max-age=15552000"/);
  assert.doesNotMatch(netlify, /unsafe-eval|default-src \*/i);
});

test('manual Netlify deploy artifact carries the same browser security boundary', () => {
  assert.match(artifactHeaders, /^\/\*/m);
  for (const fragment of requiredNetlifyFragments) {
    assert.ok(artifactHeaders.includes(fragment), `dist _headers policy missing: ${fragment}`);
  }
  assert.match(artifactHeaders, /Cross-Origin-Opener-Policy:\s*same-origin/i);
  assert.match(artifactHeaders, /X-Permitted-Cross-Domain-Policies:\s*none/i);
  assert.match(artifactHeaders, /Strict-Transport-Security:\s*max-age=15552000/i);
  assert.doesNotMatch(artifactHeaders, /unsafe-eval|default-src \*/i);
  assert.match(buildScript, /'sw\.js',\s*'_headers'/, 'build must copy _headers into dist');
  assert.match(buildScript, /Netlify security headers are missing from production build/);
});
