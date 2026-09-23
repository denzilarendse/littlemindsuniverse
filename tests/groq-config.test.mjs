import test from 'node:test';
import assert from 'node:assert/strict';
import { createMiloReply } from '../api/milo.js';

const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json' }
});

test('Milo uses GROQ_API_KEY and the Groq OpenAI-compatible endpoint', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.GROQ_API_KEY = 'provider-test-secret';
  process.env.GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
  process.env.MILO_MODEL = 'openai/gpt-oss-120b';
  process.env.MILO_MAX_REQUESTS_5M = '20';
  delete process.env.NINEROUTER_API_KEY;
  delete process.env.NINEROUTER_BASE_URL;

  const userId = '11111111-1111-4111-8111-111111111111';
  let providerRequest = null;
  let auditBody = null;

  global.fetch = async (url, options = {}) => {
    const u = String(url);
    if (u.endsWith('/auth/v1/user')) return jsonResponse({ id: userId });
    if (u.includes('/rest/v1/profiles?')) return jsonResponse([{ id: userId, role: 'learner' }]);
    if (u.includes('/rest/v1/milo_assistance_events?')) return jsonResponse([]);
    if (u.endsWith('/rest/v1/rpc/log_milo_assistance_event')) {
      auditBody = JSON.parse(options.body);
      return jsonResponse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    }
    if (u === 'https://api.groq.com/openai/v1/chat/completions') {
      providerRequest = { url: u, options };
      return jsonResponse({ choices: [{ message: { content: 'Tell me what you tried first.' } }] });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  const result = await createMiloReply({
    method: 'POST',
    headers: { authorization: 'Bearer valid-session' },
    body: { message: 'Help me with this problem', age: 9, helpLevel: 2 }
  });

  assert.equal(providerRequest.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(providerRequest.options.headers.Authorization, 'Bearer provider-test-secret');
  assert.equal(JSON.parse(providerRequest.options.body).model, 'openai/gpt-oss-120b');
  assert.equal(result.meta.provider, 'groq');
  assert.equal(auditBody.p_provider, 'groq');
});
