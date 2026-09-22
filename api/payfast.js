import { applyCors, HttpError, requireMethod, requireUuid, sendError, getPublicAppUrl } from './_lib/http.js';
import { authenticateRequest, adminGet, adminRpc } from './_lib/supabase.js';
import { fetchReferenceRate, supportedDisplayCurrencies } from './_lib/fx.js';
import { paymentEndpoint, signEntries } from './_lib/payfast.js';

function planCode(value) {
  const code = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,64}$/.test(code)) throw new HttpError(400, 'Invalid plan_code');
  return code;
}

function optionalUuid(value, field) {
  return value == null || value === '' ? null : requireUuid(value, field);
}

export async function createCheckout(req) {
  const { user } = await authenticateRequest(req);
  const body = req.body || {};
  const code = planCode(body.plan_code);
  const learnerId = optionalUuid(body.learner_id, 'learner_id');
  const organizationId = optionalUuid(body.organization_id, 'organization_id');
  const seatCount = Number.isInteger(Number(body.seat_count)) ? Number(body.seat_count) : 1;
  const displayCurrency = String(body.display_currency || 'USD').trim().toUpperCase();
  if (!supportedDisplayCurrencies().has(displayCurrency)) throw new HttpError(400, 'Unsupported display currency');

  const plans = await adminGet(
    `billing_plans?select=code,name,base_currency,active,self_service,minimum_seats&code=eq.${encodeURIComponent(code)}&active=is.true&limit=1`
  );
  const plan = Array.isArray(plans) ? plans[0] : null;
  if (!plan) throw new HttpError(400, 'Billing plan is not active');
  if (!plan.self_service) throw new HttpError(403, 'This plan requires school sales approval');

  const baseCurrency = String(plan.base_currency || 'USD').toUpperCase();
  const [toZar, toDisplay] = await Promise.all([
    fetchReferenceRate(baseCurrency, 'ZAR'),
    fetchReferenceRate(baseCurrency, displayCurrency)
  ]);
  const fetchedAt = new Date().toISOString();
  const sourceDate = toZar.date || toDisplay.date || fetchedAt.slice(0, 10);

  const quoteRows = await adminRpc('create_payment_quote', {
    p_profile_id: user.id,
    p_learner_id: learnerId,
    p_organization_id: organizationId,
    p_plan_code: code,
    p_seat_count: seatCount,
    p_display_currency: displayCurrency,
    p_rate_to_zar: toZar.rate,
    p_rate_to_display: toDisplay.rate,
    p_fx_source: 'frankfurter-v2-reference',
    p_fx_source_date: sourceDate,
    p_fx_fetched_at: fetchedAt
  });
  const quote = Array.isArray(quoteRows) ? quoteRows[0] : null;
  if (!quote?.quote_id) throw new HttpError(502, 'Could not create payment quote');

  const orderRows = await adminRpc('create_payment_order_from_quote', {
    p_profile_id: user.id,
    p_quote_id: quote.quote_id
  });
  const order = Array.isArray(orderRows) ? orderRows[0] : null;
  if (!order?.order_id) throw new HttpError(502, 'Could not create payment order');

  const appUrl = getPublicAppUrl();
  const merchantId = String(process.env.PAYFAST_MERCHANT_ID || '');
  const merchantKey = String(process.env.PAYFAST_MERCHANT_KEY || '');
  const passphrase = String(process.env.PAYFAST_PASSPHRASE || '');
  if (!merchantId || !merchantKey) throw new HttpError(503, 'PayFast is not configured');

  const amount = Number(order.amount_zar);
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(502, 'Authoritative order amount is invalid');

  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: new URL('/?payment=success', appUrl).toString(),
    cancel_url: new URL('/?payment=cancelled', appUrl).toString(),
    notify_url: new URL('/api/payfast-itn', appUrl).toString(),
    name_first: String(user.user_metadata?.display_name || user.user_metadata?.full_name || 'LittleMinds').slice(0, 100),
    email_address: user.email || undefined,
    m_payment_id: order.order_id,
    amount: amount.toFixed(2),
    item_name: String(order.plan_name || plan.name || 'LittleMindsUniverse').slice(0, 100)
  };
  const signature = signEntries(Object.entries(fields), passphrase);

  return {
    endpoint: paymentEndpoint(process.env.PAYFAST_SANDBOX === 'true'),
    fields: { ...fields, signature },
    quote: {
      id: quote.quote_id,
      plan: code,
      pricing_phase: order.pricing_phase,
      base_currency: quote.base_currency,
      base_amount: Number(quote.base_amount),
      settlement_currency: 'ZAR',
      settlement_amount: amount,
      display_currency: quote.display_currency,
      display_amount: Number(quote.display_amount),
      expires_at: quote.expires_at,
      fx_source: 'frankfurter-v2-reference',
      fx_source_date: sourceDate
    }
  };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    requireMethod(req, 'POST');
    return res.status(200).json(await createCheckout(req));
  } catch (error) {
    return sendError(res, error);
  }
}
