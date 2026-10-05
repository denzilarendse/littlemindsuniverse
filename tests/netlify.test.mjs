import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../netlify/functions/health.mjs';
import { adaptVercelHandler } from '../netlify/functions/_adapter.mjs';

test('Netlify adapter preserves JSON request bodies and response status/headers', async () => {
  const wrapped = adaptVercelHandler(async (req, res) => {
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.authorization, 'Bearer token');
    assert.deepEqual(req.body, { ok: true });
    res.setHeader('X-Test', 'yes');
    return res.status(201).json({ accepted: true });
  });
  const response = await wrapped(new Request('https://example.test/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer token' },
    body: JSON.stringify({ ok: true })
  }));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('x-test'), 'yes');
  assert.deepEqual(await response.json(), { accepted: true });
});

test('Netlify health path executes the shared production handler', async () => {
  const response = await health(new Request('https://example.test/api/health'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, 'littlemindsuniverse');
});

