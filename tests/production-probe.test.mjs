import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRuntimeConfig, assertSecurityHeaders, sameSiteHost, validateOrigin } from '../scripts/verify-production.mjs';

test('production probe accepts only credential-free HTTPS origins', () => {
  assert.equal(validateOrigin('https://www.littlemindsuniverse.co.za').origin, 'https://www.littlemindsuniverse.co.za');
  assert.throws(() => validateOrigin('http://www.littlemindsuniverse.co.za'), /must use HTTPS/);
  assert.throws(() => validateOrigin('https://user:pass@example.com'), /must not contain credentials/);
  assert.throws(() => validateOrigin('https://example.com/path'), /Use only the production origin/);
});

test('www and apex hostnames are treated as one controlled site, unrelated redirects are not', () => {
  assert.equal(sameSiteHost('www.littlemindsuniverse.co.za', 'littlemindsuniverse.co.za'), true);
  assert.equal(sameSiteHost('littlemindsuniverse.co.za', 'www.littlemindsuniverse.co.za'), true);
  assert.equal(sameSiteHost('littlemindsuniverse.co.za.evil.example', 'littlemindsuniverse.co.za'), false);
});

test('security header assertion requires the browser hardening contract', () => {
  const good = new Headers({
    'content-security-policy': "default-src 'self'; object-src 'none'; connect-src 'self' https://example.supabase.co",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(self), microphone=(self), geolocation=()',
    'strict-transport-security': 'max-age=15552000'
  });
  assert.doesNotThrow(() => assertSecurityHeaders(good));
  const weak = new Headers(good);
  weak.delete('strict-transport-security');
  assert.throws(() => assertSecurityHeaders(weak), /strict-transport-security/);
});

test('runtime config assertion allows the publishable credential but rejects server-secret variables', () => {
  assert.doesNotThrow(() => assertRuntimeConfig(`window.LMU_CONFIG={environment:'release-candidate',supabasePublishableKey:'sb_publishable_example'}`));
  assert.throws(() => assertRuntimeConfig(`window.LMU_CONFIG={environment:'release-candidate',supabasePublishableKey:'sb_publishable_example',SUPABASE_SECRET_KEY:'bad'}`), /server-secret variable/);
  assert.throws(() => assertRuntimeConfig(`window.LMU_CONFIG={environment:'production-ready',supabasePublishableKey:'sb_publishable_example'}`), /release-candidate/);
});
