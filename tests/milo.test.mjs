import test from 'node:test';
import assert from 'node:assert/strict';
import { createMiloReply } from '../api/milo.js';

const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json' }
});

function configure() {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.NINEROUTER_API_KEY = 'provider-secret';
  process.env.NINEROUTER_BASE_URL = 'https://provider.example/v1';
  process.env.MILO_MODEL = 'test-model';
  process.env.MILO_MAX_REQUESTS_5M = '20';
}

function request(body = {}, token = 'valid-session') {
  return {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body
  };
}

function learnerRow(id, userId, overrides = {}) {
  return {
    id,
    user_id: userId,
    birth_date: '2017-06-01',
    country_code: 'ZA',
    curriculum_code: 'CAPS',
    stage_code: 'DB810',
    home_language: 'en',
    learning_language: 'en',
    second_language: null,
    ...overrides
  };
}

function handleSessionRpc(u, options, {
  sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  onStart = null,
  onEvent = null
} = {}) {
  if (u.includes('/rest/v1/milo_learning_events?')) return jsonResponse([]);
  if (u.endsWith('/rest/v1/rpc/start_milo_learning_session_v2')) {
    const body = JSON.parse(options.body);
    onStart?.(body);
    return jsonResponse(sessionId);
  }
  if (u.endsWith('/rest/v1/rpc/record_milo_learning_event')) {
    const body = JSON.parse(options.body);
    onEvent?.(body);
    return jsonResponse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  }
  return null;
}

test('Milo rejects unauthenticated requests before provider access', async () => {
  configure();
  let calls = 0;
  global.fetch = async () => { calls += 1; return jsonResponse({}); };
  await assert.rejects(
    () => createMiloReply(request({ message: 'hello' }, '')),
    error => error?.status === 401
  );
  assert.equal(calls, 0);
});

test('Milo derives role and learner stage server-side and ignores spoofed role/age', async () => {
  configure();
  const userId = '11111111-1111-4111-8111-111111111111';
  const learnerId = '12121212-1212-4121-8121-121212121212';
  let providerBody = null;
  let startBody = null;
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    if (u.endsWith('/auth/v1/user')) return jsonResponse({ id: userId });
    if (u.includes('/rest/v1/profiles?')) return jsonResponse([{ id: userId, role: 'learner' }]);
    if (u.includes('/rest/v1/milo_assistance_events?')) return jsonResponse([]);
    if (u.includes('/rest/v1/learners?')) return jsonResponse([learnerRow(learnerId, userId)]);
    const session = handleSessionRpc(u, options, { onStart: body => { startBody = body; } });
    if (session) return session;
    if (u.endsWith('/rest/v1/rpc/log_milo_assistance_event')) return jsonResponse('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    if (u === 'https://provider.example/v1/chat/completions') {
      providerBody = JSON.parse(options.body);
      return jsonResponse({ choices: [{ message: { content: 'Try the first step yourself.' } }] });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  const result = await createMiloReply(request({
    message: 'Give me the answer',
    role: 'teacher',
    age: 3,
    helpLevel: 2,
    assessment: false
  }));

  assert.equal(result.meta.role, 'learner');
  assert.equal(result.meta.stageCode, 'DB810');
  assert.equal(result.meta.engine, 'brilliant_tutor');
  assert.equal(result.meta.assessment, false);
  assert.equal(startBody.p_engine, 'brilliant_tutor');
  assert.equal(startBody.p_learner_id, learnerId);
  assert.match(providerBody.messages[0].content, /Learner Milo/);
  assert.match(providerBody.messages[0].content, /Discovery Builders \(DB810\)/);
  assert.doesNotMatch(providerBody.messages[0].content, /Early Explorers age 2-4/);
  assert.doesNotMatch(providerBody.messages[0].content, /You are Teacher Milo/);
});

test('Milo rate limit blocks provider access for an over-limit authenticated account', async () => {
  configure();
  let providerCalls = 0;
  global.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith('/auth/v1/user')) return jsonResponse({ id: '22222222-2222-4222-8222-222222222222' });
    if (u.includes('/rest/v1/profiles?')) return jsonResponse([{ id: '22222222-2222-4222-8222-222222222222', role: 'parent' }]);
    if (u.includes('/rest/v1/milo_assistance_events?')) return jsonResponse(Array.from({ length: 20 }, (_, i) => ({ id: String(i) })));
    if (u === 'https://provider.example/v1/chat/completions') providerCalls += 1;
    return jsonResponse({});
  };

  await assert.rejects(
    () => createMiloReply(request({ message: 'hello' })),
    error => error?.status === 429
  );
  assert.equal(providerCalls, 0);
});

test('Milo derives assessment mode and help level from the assigned server learning item', async () => {
  configure();
  const userId = '33333333-3333-4333-8333-333333333333';
  const learnerId = '44444444-4444-4444-8444-444444444444';
  const itemId = '55555555-5555-4555-8555-555555555555';
  let providerBody = null;
  let auditBody = null;
  let startBody = null;

  global.fetch = async (url, options = {}) => {
    const u = String(url);
    if (u.endsWith('/auth/v1/user')) return jsonResponse({ id: userId });
    if (u.includes('/rest/v1/profiles?')) return jsonResponse([{ id: userId, role: 'learner' }]);
    if (u.includes('/rest/v1/milo_assistance_events?')) return jsonResponse([]);
    if (u.includes('/rest/v1/learners?')) return jsonResponse([learnerRow(learnerId, userId)]);
    if (u.endsWith('/rest/v1/rpc/get_assigned_learning_item')) {
      const body = JSON.parse(options.body);
      assert.equal(body.p_learning_item_id, itemId);
      assert.equal(body.p_learner_id, learnerId);
      return jsonResponse([{ learning_item_id: itemId, learner_id: learnerId, subject: 'Mathematics', curriculum_code: 'CAPS' }]);
    }
    if (u.includes('/rest/v1/learning_items?')) {
      return jsonResponse([{ id: itemId, item_type: 'assessment', day_role: 'assessment', content_json: {}, curriculum_code: 'CAPS', subject: 'Mathematics' }]);
    }
    const session = handleSessionRpc(u, options, { onStart: body => { startBody = body; } });
    if (session) return session;
    if (u.endsWith('/rest/v1/rpc/log_milo_assistance_event')) {
      auditBody = JSON.parse(options.body);
      return jsonResponse('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    }
    if (u === 'https://provider.example/v1/chat/completions') {
      providerBody = JSON.parse(options.body);
      return jsonResponse({ choices: [{ message: { content: 'Check the operation you chose in the first line.' } }] });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  const result = await createMiloReply(request({
    message: 'Is my answer 42?',
    helpLevel: 5,
    assessment: false,
    learningItemId: itemId,
    context: { subject: 'client-spoofed subject' }
  }));

  assert.equal(result.meta.assessment, true);
  assert.equal(result.meta.helpLevel, 1);
  assert.equal(result.meta.learningItemId, itemId);
  assert.equal(result.meta.engine, 'reasoning_missions');
  assert.equal(result.meta.sessionMode, 'assessment');
  assert.equal(startBody.p_session_mode, 'assessment');
  assert.equal(startBody.p_assistance_level, 1);
  assert.match(providerBody.messages[0].content, /ASSESSMENT MODE/);
  assert.match(providerBody.messages[0].content, /Apply only help level 1/);
  assert.match(providerBody.messages[0].content, /Subject: Mathematics/);
  assert.equal(auditBody.p_assessment_context, true);
  assert.equal(auditBody.p_effective_help_level, 1);
  assert.equal(auditBody.p_learner_id, learnerId);
  assert.equal(auditBody.p_learning_item_id, itemId);
});

test('Milo never trusts a client assessment flag without an authorized learning item', async () => {
  configure();
  const userId = '66666666-6666-4666-8666-666666666666';
  const learnerId = '67676767-6767-4676-8676-676767676767';
  let providerBody = null;
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    if (u.endsWith('/auth/v1/user')) return jsonResponse({ id: userId });
    if (u.includes('/rest/v1/profiles?')) return jsonResponse([{ id: userId, role: 'learner' }]);
    if (u.includes('/rest/v1/milo_assistance_events?')) return jsonResponse([]);
    if (u.includes('/rest/v1/learners?')) return jsonResponse([learnerRow(learnerId, userId)]);
    const session = handleSessionRpc(u, options);
    if (session) return session;
    if (u.endsWith('/rest/v1/rpc/log_milo_assistance_event')) return jsonResponse('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
    if (u === 'https://provider.example/v1/chat/completions') {
      providerBody = JSON.parse(options.body);
      return jsonResponse({ choices: [{ message: { content: 'Tell me what you tried first.' } }] });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  const result = await createMiloReply(request({ message: 'test', assessment: true, helpLevel: 4 }));
  assert.equal(result.meta.assessment, false);
  assert.equal(result.meta.helpLevel, 4);
  assert.notEqual(result.meta.sessionMode, 'assessment');
  assert.doesNotMatch(providerBody.messages[0].content, /This assessment context was derived/);
});

test('Milo denies learning-item context when assignment authorization fails', async () => {
  configure();
  const itemId = '77777777-7777-4777-8777-777777777777';
  let providerCalls = 0;
  global.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith('/auth/v1/user')) return jsonResponse({ id: '88888888-8888-4888-8888-888888888888' });
    if (u.includes('/rest/v1/profiles?')) return jsonResponse([{ id: '88888888-8888-4888-8888-888888888888', role: 'learner' }]);
    if (u.includes('/rest/v1/milo_assistance_events?')) return jsonResponse([]);
    if (u.includes('/rest/v1/learners?')) return jsonResponse([learnerRow('99999999-9999-4999-8999-999999999999', '88888888-8888-4888-8888-888888888888')]);
    if (u.endsWith('/rest/v1/rpc/get_assigned_learning_item')) return jsonResponse({ message: 'not authorized' }, 403);
    if (u === 'https://provider.example/v1/chat/completions') providerCalls += 1;
    return jsonResponse({});
  };

  await assert.rejects(
    () => createMiloReply(request({ message: 'help', learningItemId: itemId })),
    error => error?.status === 403
  );
  assert.equal(providerCalls, 0);
});

test('Milo records categorical learning-event metadata without conversation text', async () => {
  configure();
  const userId = 'abababab-abab-4bab-8bab-abababababab';
  const learnerId = 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd';
  let eventBody = null;
  global.fetch = async (url, options = {}) => {
    const u = String(url);
    if (u.endsWith('/auth/v1/user')) return jsonResponse({ id: userId });
    if (u.includes('/rest/v1/profiles?')) return jsonResponse([{ id: userId, role: 'learner' }]);
    if (u.includes('/rest/v1/milo_assistance_events?')) return jsonResponse([]);
    if (u.includes('/rest/v1/learners?')) return jsonResponse([learnerRow(learnerId, userId)]);
    const session = handleSessionRpc(u, options, { onEvent: body => { eventBody = body; } });
    if (session) return session;
    if (u.endsWith('/rest/v1/rpc/log_milo_assistance_event')) return jsonResponse('fefefefe-fefe-4efe-8efe-fefefefefefe');
    if (u === 'https://provider.example/v1/chat/completions') {
      return jsonResponse({ choices: [{ message: { content: 'Show me your first idea.' } }] });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  await createMiloReply(request({ message: 'Help me understand fractions', helpLevel: 2 }));
  assert.equal(eventBody.p_activity_type, 'tutor_turn');
  assert.equal(eventBody.p_metadata.messageChars, 'Help me understand fractions'.length);
  assert.equal('message' in eventBody.p_metadata, false);
  assert.equal('response' in eventBody.p_metadata, false);
});
