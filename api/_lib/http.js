export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function sendError(res, error) {
  const status = Number(error?.status) || 500;
  const message = status >= 500 ? 'Internal server error' : String(error?.message || 'Request failed');
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: message });
}

export function requireMethod(req, method) {
  if (req.method !== method) throw new HttpError(405, 'Method not allowed');
}

export function getBearerToken(req) {
  const value = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(value));
  if (!match) throw new HttpError(401, 'Authentication required');
  return match[1].trim();
}

export function getPublicAppUrl() {
  const raw = String(process.env.PUBLIC_APP_URL || '').trim();
  if (!raw) throw new HttpError(503, 'PUBLIC_APP_URL is not configured');
  let url;
  try { url = new URL(raw); } catch { throw new HttpError(503, 'PUBLIC_APP_URL is invalid'); }
  const sandbox = process.env.PAYFAST_SANDBOX === 'true';
  if (!sandbox && url.protocol !== 'https:') throw new HttpError(503, 'Production app URL must use HTTPS');
  return url;
}

function configuredOrigins() {
  const values = new Set();
  try { values.add(getPublicAppUrl().origin); } catch {}
  for (const item of String(process.env.CORS_ALLOWED_ORIGINS || '').split(',')) {
    const origin = item.trim();
    if (origin) values.add(origin);
  }
  if (process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production') {
    values.add('http://localhost:5500');
    values.add('http://127.0.0.1:5500');
    values.add('http://localhost:3000');
    values.add('http://127.0.0.1:3000');
  }
  return values;
}

export function applyCors(req, res) {
  const origin = String(req.headers?.origin || '');
  if (origin && configuredOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function requireUuid(value, fieldName) {
  const text = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new HttpError(400, `${fieldName} must be a UUID`);
  }
  return text;
}
