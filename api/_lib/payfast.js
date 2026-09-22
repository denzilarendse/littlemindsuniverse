import crypto from 'node:crypto';

export function payfastEncode(value) {
  return encodeURIComponent(String(value).trim()).replace(/%20/g, '+');
}

export function parameterString(entries, passphrase = '') {
  const pairs = [];
  for (const [key, value] of entries) {
    if (key === 'signature' || value === undefined || value === null || String(value) === '') continue;
    pairs.push(`${key}=${payfastEncode(value)}`);
  }
  if (passphrase) pairs.push(`passphrase=${payfastEncode(passphrase)}`);
  return pairs.join('&');
}

export function signEntries(entries, passphrase = '') {
  return crypto.createHash('md5').update(parameterString(entries, passphrase)).digest('hex');
}

export function timingSafeHexEqual(a, b) {
  const left = Buffer.from(String(a || '').toLowerCase(), 'utf8');
  const right = Buffer.from(String(b || '').toLowerCase(), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function paymentEndpoint(sandbox) {
  return sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process';
}

export function validationEndpoint(sandbox) {
  return sandbox ? 'https://sandbox.payfast.co.za/eng/query/validate' : 'https://www.payfast.co.za/eng/query/validate';
}
