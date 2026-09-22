import dns from 'node:dns/promises';
import { HttpError, requireMethod, requireUuid } from './_lib/http.js';
import { adminRpc } from './_lib/supabase.js';
import { parameterString, signEntries, timingSafeHexEqual, validationEndpoint } from './_lib/payfast.js';

export const config = { api: { bodyParser: false } };

export async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return new URLSearchParams(req.body).toString();
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export function parseItn(rawBody) {
  const params = new URLSearchParams(rawBody);
  const entries = [...params.entries()];
  const fields = Object.fromEntries(entries);
  return { entries, fields };
}

export function verifyItnSignature(entries, suppliedSignature, passphrase) {
  const expected = signEntries(entries, passphrase);
  return timingSafeHexEqual(expected, suppliedSignature);
}

function normalizeIp(value) {
  return String(value || '').split(',')[0].trim().replace(/^::ffff:/, '');
}

async function payfastSourceAddresses() {
  const hosts = String(process.env.PAYFAST_SOURCE_HOSTS || 'www.payfast.co.za,api.payfast.co.za,ips.payfast.co.za,w1w.payfast.co.za,w2w.payfast.co.za')
    .split(',').map(v => v.trim()).filter(Boolean);
  const addresses = new Set();
  await Promise.all(hosts.map(async host => {
    const [v4, v6] = await Promise.all([
      dns.resolve4(host).catch(() => []),
      dns.resolve6(host).catch(() => [])
    ]);
    for (const ip of [...v4, ...v6]) addresses.add(normalizeIp(ip));
  }));
  return addresses;
}

export async function verifyPayfastSource(req, sandbox) {
  if (sandbox && process.env.PAYFAST_VERIFY_SANDBOX_SOURCE_IP !== 'true') return true;
  const ip = normalizeIp(req.headers?.['x-forwarded-for']);
  if (!ip) return false;
  const allowed = await payfastSourceAddresses();
  return allowed.has(ip);
}

export async function validateWithPayfast(rawBody, sandbox) {
  const response = await fetch(validationEndpoint(sandbox), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'LittleMindsUniverse/4.0' },
    body: rawBody
  });
  if (!response.ok) throw new HttpError(502, 'PayFast validation service failed');
  return (await response.text()).trim() === 'VALID';
}

export async function processItn(req) {
  requireMethod(req, 'POST');
  const rawBody = await readRawBody(req);
  if (!rawBody || Buffer.byteLength(rawBody) > 64 * 1024) throw new HttpError(400, 'Invalid notification body');
  const { entries, fields } = parseItn(rawBody);

  const merchantId = String(process.env.PAYFAST_MERCHANT_ID || '');
  const passphrase = String(process.env.PAYFAST_PASSPHRASE || '');
  if (!merchantId) throw new HttpError(503, 'PayFast is not configured');
  if (fields.merchant_id !== merchantId) throw new HttpError(403, 'Invalid merchant');
  if (!fields.signature || !verifyItnSignature(entries, fields.signature, passphrase)) throw new HttpError(403, 'Invalid PayFast signature');

  const sandbox = process.env.PAYFAST_SANDBOX === 'true';
  if (!(await verifyPayfastSource(req, sandbox))) throw new HttpError(403, 'Invalid PayFast source');
  if (!(await validateWithPayfast(rawBody, sandbox))) throw new HttpError(403, 'PayFast notification validation failed');

  const orderId = requireUuid(fields.m_payment_id, 'm_payment_id');
  const amount = Number(fields.amount_gross);
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Invalid payment amount');
  if (!fields.pf_payment_id) throw new HttpError(400, 'Missing PayFast payment identifier');

  const result = await adminRpc('finalize_payfast_payment', {
    p_order_id: orderId,
    p_pf_payment_id: fields.pf_payment_id,
    p_payment_status: fields.payment_status || '',
    p_amount_gross: amount,
    p_payload: fields
  });
  return Boolean(result);
}

export default async function handler(req, res) {
  try {
    await processItn(req);
    return res.status(200).send('OK');
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error(error);
    return res.status(status).send(status >= 500 ? 'Temporary processing error' : String(error?.message || 'Rejected'));
  }
}

// Exported only for deterministic tests and PayFast support diagnostics.
export { parameterString };
