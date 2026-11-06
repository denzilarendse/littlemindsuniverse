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

test('Netlify CSP exactly mirrors Vercel and _headers canonical policy', () => {
  const vercelCsp = vercel.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
  const netlifyMatch = netlify.match(/Content-Security-Policy\s*=\s*"([^"]+)"/);
  assert.ok(netlifyMatch, 'Netlify CSP must exist');
  const netlifyCsp = netlifyMatch[1];
  const headersMatch = artifactHeaders.match(/Content-Security-Policy:\s*([^\n]+)/);
  assert.ok(headersMatch, '_headers CSP must exist');
  const headersCsp = headersMatch[1].trim();
  // Exact equality - not just fragments
  assert.equal(netlifyCsp, vercelCsp, 'Netlify CSP must exactly equal Vercel CSP - exact parity required');
  assert.equal(headersCsp, vercelCsp, '_headers CSP must exactly equal Vercel CSP');
  // Ensure no Groq in browser CSP (server function only)
  assert.doesNotMatch(netlifyCsp, /groq/i, 'Groq must not be in browser CSP - server-only');
  assert.doesNotMatch(vercelCsp, /groq/i, 'Groq must not be in browser CSP');
  // Ensure restrictive img/font/media
  assert.match(netlifyCsp, /img-src 'self' data: blob: https:\/\/zcokxljcsfkrlouzragv\.supabase\.co/);
  assert.match(netlifyCsp, /font-src 'self' data:;/);
  assert.match(netlifyCsp, /media-src 'self' blob: https:\/\/zcokxljcsfkrlouzragv\.supabase\.co/);
  assert.match(netlifyCsp, /upgrade-insecure-requests/);
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
