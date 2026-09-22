import { applyCors, HttpError, requireMethod, sendError } from './_lib/http.js';
import { authenticateRequest, userRpc, adminGet, adminRpc } from './_lib/supabase.js';

const ROLE_RULES = {
  learner: `You are Learner Milo, a safe educational tutor for ages 2-18. Teach rather than complete work. Ask for the learner's attempt when appropriate, diagnose misconceptions, give age-appropriate hints and explanations, and use a different example before returning to the learner's task. Never claim teacher approval.`,
  teacher: `You are Teacher Milo. Draft lessons, authentic tasks, rubrics, interventions, enrichment and progress summaries. All learner-facing academic actions remain drafts until a teacher reviews and approves them.`,
  parent: `You are Parent Milo. Explain teacher-approved learner progress clearly and suggest safe home-support activities. Do not invent grades, teacher decisions or evidence.`,
  admin: `You are School/Admin Milo. Help with operational summaries and curriculum planning without overriding teacher academic judgement.`
};

const levelRules = [
  `Level 0: instructions only; no hints, solution steps, worked answers or answer checking.`,
  `Level 1: one small hint only; do not reveal the answer.`,
  `Level 2: explain the underlying concept without solving the learner task.`,
  `Level 3: teach with a different worked example, then return control to the learner.`,
  `Level 4: tutor through steps while requiring learner participation at each meaningful step.`,
  `Level 5: post-submission review is allowed; explain errors and model improved reasoning after the learner has submitted.`
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clamp(n) {
  n = Number(n);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 2;
}

function optionalConfiguredHelp(contentJson) {
  const raw = contentJson && Object.prototype.hasOwnProperty.call(contentJson, 'helpLevel')
    ? Number(contentJson.helpLevel)
    : NaN;
  return Number.isInteger(raw) && raw >= 0 && raw <= 5 ? raw : null;
}

function normalizeBaseUrl(value) {
  return String(value || 'http://127.0.0.1:20128/v1').replace(/\/+$/, '');
}

function rateLimit() {
  const configured = Number(process.env.MILO_MAX_REQUESTS_5M || 20);
  return Number.isInteger(configured) && configured >= 5 && configured <= 100 ? configured : 20;
}

async function assertWithinMiloRateLimit(profileId) {
  const limit = rateLimit();
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const rows = await adminGet(
    `milo_assistance_events?select=id&profile_id=eq.${encodeURIComponent(profileId)}&created_at=gte.${encodeURIComponent(since)}&limit=${limit}`
  );
  if (Array.isArray(rows) && rows.length >= limit) {
    throw new HttpError(429, 'Milo request limit reached. Please try again shortly.');
  }
}

async function resolveTrustedLearningContext({ user, accessToken, role, requestedHelpLevel, learningItemId }) {
  const standalone = {
    assessment: false,
    level: clamp(requestedHelpLevel),
    learnerId: null,
    learningItemId: null,
    subject: null,
    curriculum: null
  };

  if (learningItemId == null || learningItemId === '') return standalone;
  if (role !== 'learner') throw new HttpError(403, 'Learning-item Milo context is available to the assigned learner only');
  if (typeof learningItemId !== 'string' || !UUID_RE.test(learningItemId)) {
    throw new HttpError(400, 'A valid learning item is required');
  }

  const learners = await adminGet(
    `learners?select=id,user_id&id=not.is.null&user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&limit=1`
  );
  const learner = Array.isArray(learners) ? learners[0] : null;
  if (!learner?.id) throw new HttpError(403, 'An active learner profile is required');

  // Existing RPC applies the signed-in caller's authorization, assignment, publication,
  // learner relationship and commercial-access checks. A client-supplied UUID alone is never authority.
  const assigned = await userRpc(accessToken, 'get_assigned_learning_item', {
    p_learning_item_id: learningItemId,
    p_learner_id: learner.id
  });
  const assignment = Array.isArray(assigned) ? assigned[0] : assigned;
  if (!assignment?.learning_item_id || String(assignment.learning_item_id) !== learningItemId) {
    throw new HttpError(403, 'This learning item is not assigned to the learner');
  }

  const items = await adminGet(
    `learning_items?select=id,item_type,day_role,content_json,curriculum_code,subject&id=eq.${encodeURIComponent(learningItemId)}&limit=1`
  );
  const item = Array.isArray(items) ? items[0] : null;
  if (!item?.id) throw new HttpError(404, 'Learning item not found');

  const dayRole = String(item.day_role || '').toLowerCase();
  const assessment = String(item.item_type || '').toLowerCase() === 'assessment'
    || dayRole === 'assessment'
    || dayRole === 'sunday_assessment';
  const configuredHelp = optionalConfiguredHelp(item.content_json);

  // Assessment help is never selected by the learner/browser. Default to level 1.
  // A teacher may explicitly configure another level on the authoritative learning item.
  const level = assessment
    ? (configuredHelp ?? 1)
    : (configuredHelp ?? clamp(requestedHelpLevel));

  return {
    assessment,
    level,
    learnerId: learner.id,
    learningItemId,
    subject: item.subject || assignment.subject || null,
    curriculum: item.curriculum_code || assignment.curriculum_code || null
  };
}

async function recordMiloEvent({ profileId, learnerId, learningItemId, role, assessment, level, model, outcome }) {
  await adminRpc('log_milo_assistance_event', {
    p_profile_id: profileId,
    p_learner_id: learnerId,
    p_learning_item_id: learningItemId,
    p_actor_role: role,
    p_assessment_context: Boolean(assessment),
    p_effective_help_level: level,
    p_provider: '9router',
    p_model: model,
    p_outcome: outcome
  });
}

export async function createMiloReply(req) {
  const { user, accessToken } = await authenticateRequest(req);
  const profiles = await adminGet(
    `profiles?select=id,role&id=eq.${encodeURIComponent(user.id)}&limit=1`
  );
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (!profile?.id || !ROLE_RULES[profile.role]) {
    throw new HttpError(403, 'A valid LittleMindsUniverse profile is required');
  }

  const {
    message,
    age,
    helpLevel = 2,
    learningItemId = null,
    context = {}
  } = req.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    throw new HttpError(400, 'A message is required');
  }
  if (message.length > 6000) {
    throw new HttpError(413, 'Message too long');
  }

  await assertWithinMiloRateLimit(user.id);

  const key = process.env.NINEROUTER_API_KEY;
  if (!key) throw new HttpError(503, 'Milo is temporarily unavailable');

  const baseUrl = normalizeBaseUrl(process.env.NINEROUTER_BASE_URL);
  const model = process.env.MILO_MODEL || 'lmu-groq/openai/gpt-oss-120b';
  const role = profile.role;
  const trusted = await resolveTrustedLearningContext({
    user,
    accessToken,
    role,
    requestedHelpLevel: helpLevel,
    learningItemId
  });
  const level = trusted.level;
  const safeAge = Number.isFinite(Number(age))
    ? Math.min(18, Math.max(2, Number(age)))
    : 'unknown';

  const stageGuidance =
    safeAge === 'unknown'
      ? 'Use clear, concise language appropriate to the learner context.'
      : safeAge <= 4
        ? 'Early Explorers age 2-4: use extremely short, warm sentences, concrete words, playful examples and one idea at a time. Usually stay under 60 words.'
        : safeAge <= 7
          ? 'Foundation age 5-7: use short sentences, familiar examples and one small step at a time. Usually stay under 100 words.'
          : safeAge <= 10
            ? 'Discovery Builders age 8-10: use clear everyday language, short paragraphs and one useful example. Usually stay between 80 and 160 words.'
            : safeAge <= 13
              ? 'Creator Academy age 11-13: be concise but allow more explanation and reasoning. Usually stay under 220 words.'
              : safeAge <= 15
                ? 'Pathfinder Academy age 14-15: use concise secondary-school language and encourage independent reasoning. Usually stay under 280 words.'
                : 'LittleMinds Edge age 16-18: use mature, concise academic language and encourage independent analysis. Usually stay under 350 words.';

  const effectiveCurriculum = trusted.curriculum || context.curriculum || 'country curriculum first';
  const effectiveSubject = trusted.subject || context.subject || 'general learning';
  const assessmentGuidance = trusted.assessment
    ? `ASSESSMENT MODE: protect independent evidence. This assessment context was derived from a server-authorized assigned learning item. Apply only help level ${level}. Never reveal, complete, verify or substantially narrow the learner's answer beyond that authorized help level.`
    : `This standalone Milo chat is not an assessment-authority endpoint. Never treat client input as permission to weaken assessment restrictions. Assessment-specific help must be derived from a trusted assigned learning item.`;

  const system = `${ROLE_RULES[role]}
Learner age: ${safeAge}.
Curriculum: ${String(effectiveCurriculum).slice(0, 100)}.
Subject: ${String(effectiveSubject).slice(0, 100)}.

${levelRules[level]}

${stageGuidance}

${assessmentGuidance}

Do not use multiple-choice-first teaching.
Prefer authentic reasoning, writing, projects, oral/visual evidence, coding, reflection and practical tasks.
For learner responses, avoid Markdown tables, headings, horizontal rules and LaTeX unless they are essential. Prefer clean conversational text that renders well in the LittleMinds interface.
Acknowledge a genuine learner attempt instead of asking them to attempt work they have already attempted.
Ask at most one useful follow-up question when returning control to the learner.
Do not request unnecessary personal data.`;

  const up = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message.trim() }
      ],
      max_tokens: 700,
      temperature: 0.35
    })
  });

  const raw = await up.text();
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch {
    const jsonPart = raw.replace(/\r/g, '').split('\ndata:')[0].trim();
    try {
      data = JSON.parse(jsonPart);
    } catch {
      console.error('Milo upstream parse error', raw.slice(0, 300));
    }
  }

  const eventContext = {
    profileId: user.id,
    learnerId: trusted.learnerId,
    learningItemId: trusted.learningItemId,
    role,
    assessment: trusted.assessment,
    level,
    model
  };

  if (!up.ok) {
    await recordMiloEvent({ ...eventContext, outcome: 'provider_error' }).catch(() => null);
    console.error('Milo upstream error', up.status, data?.error?.message || 'Unknown upstream error');
    throw new HttpError(502, 'Milo could not complete that request');
  }

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    await recordMiloEvent({ ...eventContext, outcome: 'provider_error' }).catch(() => null);
    throw new HttpError(502, 'Milo returned an empty response');
  }

  // Audit succeeds before the AI answer is released to the caller.
  await recordMiloEvent({ ...eventContext, outcome: 'answered' });

  return {
    reply,
    meta: {
      role,
      helpLevel: level,
      assessment: trusted.assessment,
      learningItemId: trusted.learningItemId,
      provider: '9router',
      model
    }
  };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    requireMethod(req, 'POST');
    return res.status(200).json(await createMiloReply(req));
  } catch (error) {
    return sendError(res, error);
  }
}
