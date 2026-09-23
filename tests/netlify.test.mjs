import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../netlify/functions/health.mjs';
import payfastItn from '../netlify/functions/payfast-itn.mjs';
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

test('Netlify PayFast ITN adapter preserves the raw form body byte-for-byte', async () => {
  process.env.PAYFAST_MERCHANT_ID = '10000100';
  process.env.PAYFAST_PASSPHRASE = 'pass';
  process.env.PAYFAST_SANDBOX = 'true';
  process.env.PAYFAST_VERIFY_SANDBOX_SOURCE_IP = 'false';

  // Deliberately invalid signature: the important adapter assertion is that the shared
  // ITN handler receives form data as raw text and rejects it as a PayFast request,
  // rather than failing because the adapter converted it into JSON/object form.
  const raw = 'merchant_id=10000100&m_payment_id=33333333-3333-4333-8333-333333333333&amount_gross=18.25&payment_status=COMPLETE&pf_payment_id=PF123&signature=bad';
  const response = await payfastItn(new Request('https://example.test/api/payfast-itn', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: raw
  }));
  assert.equal(response.status, 403);
  assert.match(await response.text(), /signature/i);
});
