import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckout } from '../api/payfast.js';
import { parameterString, signEntries } from '../api/_lib/payfast.js';
import { parseItn, verifyItnSignature, processItn } from '../api/payfast-itn.js';

const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

function configure() {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.PAYFAST_MERCHANT_ID = '10000100';
  process.env.PAYFAST_MERCHANT_KEY = 'merchant-key';
  process.env.PAYFAST_PASSPHRASE = 'safe-passphrase';
  process.env.PAYFAST_SANDBOX = 'true';
  process.env.PUBLIC_APP_URL = 'https://littlemindsuniverse.co.za';
  process.env.SUPPORTED_DISPLAY_CURRENCIES = 'USD,ZAR';
}

test('checkout ignores client authority and derives identity/amount server-side', async () => {
  configure();
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/auth/v1/user')) return jsonResponse({ id: '11111111-1111-4111-8111-111111111111', email: 'parent@example.test', user_metadata: { display_name: 'Parent' } });
    if (String(url).includes('/rest/v1/billing_plans?')) return jsonResponse([{ code:'family_monthly', name:'Family Monthly', base_currency:'USD', active:true, self_service:true, minimum_seats:1 }]);
    if (String(url).includes('api.frankfurter.dev/v2/rate/USD/ZAR')) return jsonResponse({ date:'2026-09-22', base:'USD', quote:'ZAR', rate:18.25 });
    if (String(url).endsWith('/rest/v1/rpc/create_payment_quote')) return jsonResponse([{ quote_id:'22222222-2222-4222-8222-222222222222', plan_name:'Family Monthly', pricing_phase:'intro', base_currency:'USD', base_amount:1, settlement_amount_zar:18.25, display_currency:'USD', display_amount:1, expires_at:'2026-09-22T20:00:00Z' }]);
    if (String(url).endsWith('/rest/v1/rpc/create_payment_order_from_quote')) return jsonResponse([{ order_id:'33333333-3333-4333-8333-333333333333', amount_zar:18.25, plan_name:'Family Monthly', pricing_phase:'intro' }]);
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const req = {
    headers: { authorization: 'Bearer user-jwt' },
    body: {
      user_id:'99999999-9999-4999-8999-999999999999',
      plan_code:'family_monthly', amount:0.01, premium_until:'2099-12-31',
      display_currency:'USD'
    }
  };
  const result = await createCheckout(req);
  assert.equal(result.fields.amount, '18.25');
  assert.equal(result.fields.m_payment_id, '33333333-3333-4333-8333-333333333333');
  assert.equal(result.fields.notify_url, 'https://littlemindsuniverse.co.za/api/payfast-itn');
  assert.equal(result.quote.pricing_phase, 'intro');

  const quoteCall = calls.find(v => v.url.endsWith('/rest/v1/rpc/create_payment_quote'));
  const quoteBody = JSON.parse(quoteCall.options.body);
  assert.equal(quoteBody.p_profile_id, '11111111-1111-4111-8111-111111111111');
  assert.equal(quoteBody.p_rate_to_zar, 18.25);
  assert.ok(!('amount' in quoteBody));
  assert.ok(!('premium_until' in quoteBody));
});

test('non-self-service school plan cannot be opened through public checkout', async () => {
  configure();
  global.fetch = async url => {
    if (String(url).endsWith('/auth/v1/user')) return jsonResponse({ id:'11111111-1111-4111-8111-111111111111' });
    if (String(url).includes('/rest/v1/billing_plans?')) return jsonResponse([{ code:'school_500_monthly', name:'School', base_currency:'USD', active:true, self_service:false, minimum_seats:500 }]);
    throw new Error(`Unexpected fetch: ${url}`);
  };
  await assert.rejects(() => createCheckout({ headers:{authorization:'Bearer user-jwt'}, body:{plan_code:'school_500_monthly'} }), error => error.status === 403);
});

test('PayFast parameter string excludes signature and uses plus for spaces', () => {
  const entries = [['merchant_id','10000100'],['item_name','Little Minds'],['signature','ignored']];
  assert.equal(parameterString(entries, 'pass phrase'), 'merchant_id=10000100&item_name=Little+Minds&passphrase=pass+phrase');
  assert.match(signEntries(entries, 'pass phrase'), /^[a-f0-9]{32}$/);
});

test('ITN signature validation detects tampering', () => {
  const pairs = [['merchant_id','10000100'],['m_payment_id','33333333-3333-4333-8333-333333333333'],['amount_gross','18.25'],['payment_status','COMPLETE'],['pf_payment_id','PF123']];
  const signature = signEntries(pairs, 'safe-passphrase');
  const raw = new URLSearchParams([...pairs, ['signature',signature]]).toString();
  const parsed = parseItn(raw);
  assert.equal(verifyItnSignature(parsed.entries, parsed.fields.signature, 'safe-passphrase'), true);
  parsed.entries[2][1] = '0.01';
  assert.equal(verifyItnSignature(parsed.entries, parsed.fields.signature, 'safe-passphrase'), false);
});


test('verified PayFast sandbox ITN reaches settlement finalizer only after provider validation', async () => {
  configure();
  process.env.PAYFAST_VERIFY_SANDBOX_SOURCE_IP = 'false';
  const pairs = [
    ['merchant_id','10000100'],
    ['m_payment_id','33333333-3333-4333-8333-333333333333'],
    ['amount_gross','18.25'],
    ['payment_status','COMPLETE'],
    ['pf_payment_id','PF123']
  ];
  const signature = signEntries(pairs, 'safe-passphrase');
  const raw = new URLSearchParams([...pairs, ['signature', signature]]).toString();
  let finalizedBody = null;
  let validationCalled = false;
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    if (u === 'https://sandbox.payfast.co.za/eng/query/validate') {
      validationCalled = true;
      assert.equal(options.method, 'POST');
      assert.equal(options.body, raw);
      return new Response('VALID', { status: 200 });
    }
    if (u.endsWith('/rest/v1/rpc/finalize_payfast_payment')) {
      finalizedBody = JSON.parse(options.body);
      return jsonResponse(true);
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  const result = await processItn({ method:'POST', headers:{}, body:raw });
  assert.equal(result, true);
  assert.equal(validationCalled, true);
  assert.deepEqual(finalizedBody, {
    p_order_id:'33333333-3333-4333-8333-333333333333',
    p_pf_payment_id:'PF123',
    p_payment_status:'COMPLETE',
    p_amount_gross:18.25,
    p_payload:Object.fromEntries([...pairs, ['signature', signature]])
  });
});

test('PayFast ITN rejected by provider validation never reaches settlement finalizer', async () => {
  configure();
  process.env.PAYFAST_VERIFY_SANDBOX_SOURCE_IP = 'false';
  const pairs = [
    ['merchant_id','10000100'],
    ['m_payment_id','33333333-3333-4333-8333-333333333333'],
    ['amount_gross','18.25'],
    ['payment_status','COMPLETE'],
    ['pf_payment_id','PF_BAD']
  ];
  const signature = signEntries(pairs, 'safe-passphrase');
  const raw = new URLSearchParams([...pairs, ['signature', signature]]).toString();
  let finalizerCalled = false;
  global.fetch = async url => {
    const u = String(url);
    if (u === 'https://sandbox.payfast.co.za/eng/query/validate') return new Response('INVALID', { status:200 });
    if (u.endsWith('/rest/v1/rpc/finalize_payfast_payment')) finalizerCalled = true;
    throw new Error(`Unexpected fetch: ${u}`);
  };

  await assert.rejects(
    () => processItn({ method:'POST', headers:{}, body:raw }),
    error => error.status === 403 && /validation failed/i.test(error.message)
  );
  assert.equal(finalizerCalled, false);
});
