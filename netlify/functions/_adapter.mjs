function headersObject(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) out[key.toLowerCase()] = value;
  return out;
}

async function requestBody(request, rawBody) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return undefined;
  const text = await request.text();
  if (!text) return rawBody ? '' : undefined;
  if (rawBody) return text;
  const type = String(request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) {
    try { return JSON.parse(text); } catch { return undefined; }
  }
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
  return text;
}

function createResponseBridge(resolve) {
  let statusCode = 200;
  const headers = new Headers();
  let completed = false;

  const finish = body => {
    if (completed) return;
    completed = true;
    resolve(new Response(body, { status: statusCode, headers }));
  };

  return {
    status(code) { statusCode = Number(code) || 200; return this; },
    setHeader(name, value) { headers.set(name, String(value)); return this; },
    json(value) {
      if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
      finish(JSON.stringify(value));
      return this;
    },
    send(value = '') {
      if (value != null && typeof value === 'object' && !Buffer.isBuffer(value)) {
        if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
        finish(JSON.stringify(value));
      } else {
        finish(value == null ? '' : value);
      }
      return this;
    },
    end(value = '') { finish(value); return this; }
  };
}

export function adaptVercelHandler(handler, { rawBody = false } = {}) {
  return async request => {
    const body = await requestBody(request, rawBody);
    const req = {
      method: request.method,
      headers: headersObject(request.headers),
      body,
      url: request.url
    };

    return await new Promise((resolve, reject) => {
      const res = createResponseBridge(resolve);
      Promise.resolve(handler(req, res)).catch(reject);
    });
  };
}
