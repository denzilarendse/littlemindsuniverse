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

function clamp(n) {
  n = Number(n);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 2;
}

function normalizeBaseUrl(value) {
  return String(value || 'http://127.0.0.1:20128/v1').replace(/\/+$/, '');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      message,
      role = 'learner',
      age,
      helpLevel = 2,
      assessment = false,
      context = {}
    } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A message is required' });
    }

    if (message.length > 6000) {
      return res.status(413).json({ error: 'Message too long' });
    }

    const key = process.env.NINEROUTER_API_KEY;

    if (!key) {
      return res.status(503).json({
        error: 'Milo is temporarily unavailable'
      });
    }

    const baseUrl = normalizeBaseUrl(process.env.NINEROUTER_BASE_URL);
    const model =
      process.env.MILO_MODEL ||
      'lmu-groq/openai/gpt-oss-120b';

    const r = ROLE_RULES[role] ? role : 'learner';

    let level = clamp(helpLevel);

    if (assessment) {
      level = Math.min(level, 1);
    }

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

    const assessmentGuidance = assessment
      ? `ASSESSMENT MODE: protect independent evidence.
The learner must do the assessed work independently.
At Help Level 0, give instructions only.
At Help Level 1, give exactly one small conceptual hint and then return control to the learner.
Do not provide the answer, calculate the result, give solution steps, create a worked parallel example, or reveal whether a proposed final answer is correct.`
      : '';

    const system = `${ROLE_RULES[r]}
Learner age: ${safeAge}.
Curriculum: ${String(
      context.curriculum || 'country curriculum first'
    ).slice(0, 100)}.
Subject: ${String(
      context.subject || 'general learning'
    ).slice(0, 100)}.

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
          {
            role: 'system',
            content: system
          },
          {
            role: 'user',
            content: message.trim()
          }
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
      const jsonPart = raw
        .replace(/\r/g, '')
        .split('\ndata:')[0]
        .trim();

      try {
        data = JSON.parse(jsonPart);
      } catch {
        console.error(
          'Milo upstream parse error',
          raw.slice(0, 300)
        );
      }
    }

    if (!up.ok) {
      console.error(
        'Milo upstream error',
        up.status,
        data?.error?.message || 'Unknown upstream error'
      );

      return res.status(502).json({
        error: 'Milo could not complete that request'
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        error: 'Milo returned an empty response'
      });
    }

    return res.status(200).json({
      reply,
      meta: {
        role: r,
        helpLevel: level,
        assessment: Boolean(assessment),
        provider: '9router',
        model
      }
    });
  } catch (e) {
    console.error('Milo error', e?.message);

    return res.status(500).json({
      error: 'Milo is temporarily unavailable'
    });
  }
}
