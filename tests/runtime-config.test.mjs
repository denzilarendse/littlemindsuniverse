import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = fs.readFileSync(path.join(root, 'assets/runtime-config.js'), 'utf8');

function loadConfig() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'assets/runtime-config.js' });
  return context.window.LMU_CONFIG;
}

test('public runtime config identifies the current build as a release candidate, not a completed production release', () => {
  const cfg = loadConfig();
  assert.equal(cfg.environment, 'release-candidate');
});

test('public testing explicitly disables commercial checkout and pricing', () => {
  const cfg = loadConfig();
  assert.equal(cfg.publicTestingMode, true);
  assert.equal(cfg.paymentsEnabled, false);
  assert.equal(cfg.pilotPaymentsRequired, false);
  assert.equal(cfg.pricing, null);
});

test('runtime config exposes only browser-safe Supabase configuration', () => {
  const cfg = loadConfig();
  assert.match(cfg.supabaseUrl, /^https:\/\/[a-z0-9]+\.supabase\.co$/);
  assert.match(cfg.supabasePublishableKey, /^sb_publishable_/);
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|PAYFAST_MERCHANT_KEY|PAYFAST_PASSPHRASE|GROQ_API_KEY/);
});

test('Vercel runtime override is Preview-only and does not disclose server credentials', () => {
  const endpoint = fs.readFileSync(path.join(root, 'api/runtime-config.js'), 'utf8');
  assert.match(endpoint, /process\.env\.VERCEL_ENV !== "preview"/);
  assert.match(endpoint, /Cache-Control/);
  assert.match(endpoint, /supabasePublishableKey: publishableKey/);
  assert.doesNotMatch(endpoint, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|GROQ_API_KEY/);
});

test('browser runtime loader validates Preview config and preserves the static fallback', () => {
  const loader = fs.readFileSync(path.join(root, 'assets/runtime-config-loader.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(loader, /\/api\/runtime-config/);
  assert.match(loader, /environment!=='preview'/);
  assert.match(loader, /Object\.freeze\(\{\.\.\.window\.LMU_CONFIG/);
  assert.match(html, /runtime-config-loader\.js/);
});

test('Supabase initialization waits for runtime environment selection', () => {
  const app = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
  const start = app.indexOf('async function initSupabase()');
  const end = app.indexOf('async function loadLive()', start);
  assert.ok(start >= 0 && end > start);
  assert.match(app.slice(start, end), /await window\.LMU_CONFIG_READY/);
});
