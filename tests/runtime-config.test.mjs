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

test('public pricing mirrors the active canonical family USD plan values', () => {
  const cfg = loadConfig();
  assert.equal(cfg.pricing.monthlyUSD, 3);
  assert.equal(cfg.pricing.annualUSD, 30);
  assert.equal(cfg.pricing.introductoryUSD, 1);
  assert.equal('monthlyZAR' in cfg.pricing, false);
  assert.equal('annualZAR' in cfg.pricing, false);
});

test('runtime config exposes only browser-safe Supabase configuration', () => {
  const cfg = loadConfig();
  assert.match(cfg.supabaseUrl, /^https:\/\/[a-z0-9]+\.supabase\.co$/);
  assert.match(cfg.supabasePublishableKey, /^sb_publishable_/);
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|PAYFAST_MERCHANT_KEY|PAYFAST_PASSPHRASE|GROQ_API_KEY/);
});
