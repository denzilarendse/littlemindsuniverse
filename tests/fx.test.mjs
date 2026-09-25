import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchReferenceRate, clearFxCacheForTests } from '../api/_lib/fx.js';

function reset() {
  process.env.NODE_ENV = 'test';
  process.env.FX_CACHE_FRESH_MS = '10000';
  process.env.FX_CACHE_MAX_STALE_MS = '60000';
  clearFxCacheForTests();
}

test('FX rate is server-fetched then reused from bounded fresh cache', async () => {
  reset();
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ date: '2026-09-25', rate: 18.5 }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const live = await fetchReferenceRate('USD', 'ZAR');
  const cached = await fetchReferenceRate('USD', 'ZAR');
  assert.equal(live.rate, 18.5);
  assert.equal(live.source, 'frankfurter-v2');
  assert.equal(cached.rate, 18.5);
  assert.equal(cached.source, 'frankfurter-v2-cache');
  assert.equal(calls, 1);
});

test('FX provider failure falls back only to a bounded stale server cache', async () => {
  reset();
  process.env.FX_CACHE_FRESH_MS = '1';
  process.env.FX_CACHE_MAX_STALE_MS = '60000';
  let fail = false;
  global.fetch = async () => {
    if (fail) throw new Error('provider unavailable');
    return new Response(JSON.stringify({ date: '2026-09-25', rate: 18.75 }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  await fetchReferenceRate('USD', 'ZAR');
  await new Promise(resolve => setTimeout(resolve, 5));
  fail = true;
  const fallback = await fetchReferenceRate('USD', 'ZAR');
  assert.equal(fallback.rate, 18.75);
  assert.equal(fallback.source, 'frankfurter-v2-stale-cache');
  assert.ok(fallback.cached_at);
});

test('FX provider failure without cache fails closed', async () => {
  reset();
  global.fetch = async () => { throw new Error('provider unavailable'); };
  await assert.rejects(
    () => fetchReferenceRate('USD', 'ZAR'),
    error => error.status === 502 && /unavailable/i.test(error.message)
  );
});
