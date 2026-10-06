import { HttpError, getBearerToken } from './http.js';

function jwtRole(value) {
  if (!String(value || '').startsWith('eyJ')) return null;
  try {
    const parts = String(value).split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function isServerAdminKey(value) {
  const key = String(value || '').trim();
  return key.startsWith('sb_secret_') || (key.startsWith('eyJ') && jwtRole(key) === 'service_role');
}

function configuredServerKey() {
  const candidates = [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ].map(value => String(value || '').trim()).filter(Boolean);
  return candidates.find(isServerAdminKey) || '';
}

function config() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '');
  const secretKey = configuredServerKey();
  if (!url || !publishableKey) throw new HttpError(503, 'Supabase public server configuration is incomplete');
  return { url, publishableKey, secretKey };
}

async function parseResponse(response, { serverAdmin = false } = {}) {
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const message = typeof data === 'object' && data ? (data.message || data.error_description || data.error) : null;
    if (serverAdmin) {
      console.error('Supabase server-side request failed', {
        status: response.status,
        code: typeof data === 'object' && data ? data.code || null : null
      });
      throw new HttpError(502, 'LittleMindsUniverse secure data service is unavailable');
    }
    throw new HttpError(response.status >= 500 ? 502 : response.status, message || 'Supabase request failed');
  }
  return data;
}

export async function authenticateRequest(req) {
  const accessToken = getBearerToken(req);
  const { url, publishableKey } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 401 || response.status === 403) throw new HttpError(401, 'Invalid or expired session');
  const user = await parseResponse(response);
  if (!user?.id) throw new HttpError(401, 'Invalid session');
  return { user, accessToken };
}

export async function userRpc(accessToken, functionName, body = {}) {
  const { url, publishableKey } = config();
  return parseResponse(await fetch(`${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }));
}

function adminHeaders(extra = {}) {
  const { secretKey } = config();
  if (!secretKey) throw new HttpError(503, 'A valid Supabase server key is not configured');
  const headers = { apikey: secretKey, ...extra };
  // Legacy service_role keys are JWTs and historically require the Authorization header.
  if (secretKey.startsWith('eyJ')) headers.Authorization = `Bearer ${secretKey}`;
  return headers;
}

export async function adminRpc(functionName, body = {}) {
  const { url } = config();
  return parseResponse(await fetch(`${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  }), { serverAdmin: true });
}

export async function adminGet(path) {
  const { url } = config();
  return parseResponse(await fetch(`${url}/rest/v1/${path}`, {
    headers: adminHeaders({ Accept: 'application/json' })
  }), { serverAdmin: true });
}

export async function adminPatch(path, body) {
  const { url } = config();
  return parseResponse(await fetch(`${url}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: adminHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(body)
  }), { serverAdmin: true });
}
