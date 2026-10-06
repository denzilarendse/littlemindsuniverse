import test from 'node:test';
import assert from 'node:assert/strict';
import { adminGet } from '../api/_lib/supabase.js';

function baseConfig() {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_public';
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function legacyServiceJwt() {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
  return head + '.' + body + '.test-signature';
}

test('server-side Supabase calls use a modern secret key only as apikey', async () => {
  baseConfig();
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_server_test';
  let headers = null;
  global.fetch = async (_url, options = {}) => {
    headers = options.headers;
    return new Response(JSON.stringify([{ id: 'ok' }]), { status: 200 });
  };
  await adminGet('profiles?select=id&limit=1');
  assert.equal(headers.apikey, 'sb_secret_server_test');
  assert.equal(headers.Authorization, undefined);
});

test('invalid publishable secret configuration falls back to a valid legacy service-role key', async () => {
  baseConfig();
  process.env.SUPABASE_SECRET_KEY = 'sb_publishable_wrong_place';
  process.env.SUPABASE_SERVICE_ROLE_KEY = legacyServiceJwt();
  let headers = null;
  global.fetch = async (_url, options = {}) => {
    headers = options.headers;
    return new Response(JSON.stringify([]), { status: 200 });
  };
  await adminGet('profiles?select=id&limit=1');
  assert.equal(headers.apikey, process.env.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(headers.Authorization, 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY);
});

test('server-side Supabase calls reject publishable or anon keys as admin credentials', async () => {
  baseConfig();
  process.env.SUPABASE_SECRET_KEY = 'sb_publishable_not_admin';
  let calls = 0;
  global.fetch = async () => { calls += 1; return new Response('[]'); };
  await assert.rejects(
    () => adminGet('profiles?select=id&limit=1'),
    error => error?.status === 503 && /valid Supabase server key/i.test(error.message)
  );
  assert.equal(calls, 0);
});

test('admin Data API errors are converted to a server failure instead of leaking database details', async () => {
  baseConfig();
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_server_test';
  global.fetch = async () => new Response(JSON.stringify({
    code: '42501',
    message: 'permission denied for table profiles'
  }), { status: 403, headers: { 'content-type': 'application/json' } });
  await assert.rejects(
    () => adminGet('profiles?select=id&limit=1'),
    error => error?.status === 502
      && error.message === 'LittleMindsUniverse secure data service is unavailable'
      && !/profiles|permission denied/i.test(error.message)
  );
});
