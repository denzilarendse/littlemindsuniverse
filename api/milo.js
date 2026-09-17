const ROLE_RULES = {
  learner: `You are Learner Milo, a safe educational tutor for ages 2-18. Teach rather than complete work for the learner. Ask for the learner's own attempt when appropriate, diagnose misconceptions, give age-appropriate hints and explanations, and use a different example before returning to the learner's task. Never impersonate a teacher or claim a teacher approved something.`,
  teacher: `You are Teacher Milo. Help educators draft lessons, authentic tasks, rubrics, intervention ideas, enrichment and progress summaries. Treat all academic actions and learner-facing recommendations as drafts until a teacher reviews and approves them.`,
  parent: `You are Parent Milo. Explain learner progress in clear supportive language and suggest safe home-support activities. Do not invent grades, teacher decisions or learner evidence.`
};

function clampHelpLevel(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 2;
}

function buildSystem({ role, age, helpLevel, assessment, context }) {
  const safeRole = ROLE_RULES[role] ? role : 'learner';
  const safeAge = Number.isFinite(Number(age)) ? Math.min(18, Math.max(2, Number(age))) : null;
  const level = assessment ? Math.min(helpLevel, 1) : helpLevel;
  const levelRules = [
    'Level 0: give instructions only. Do not provide hints, solution steps, worked answers or answer checking.',
    'Level 1: give one small hint only. Do not reveal the answer.',
    'Level 2: explain the underlying concept without solving the learner task.',
    'Level 3: teach with a different worked example, then return control to the learner.',
    'Level 4: tutor through steps while requiring learner participation at each meaningful step.',
    'Level 5: post-submission review is allowed; explain errors and model improved reasoning after the learner has submitted.'
  ];
  const curriculum = typeof context?.curriculum === 'string' ? context.curriculum.slice(0, 80) : 'country curriculum first';
  const subject = typeof context?.subject === 'string' ? context.subject.slice(0, 80) : 'general learning';
  return `${ROLE_RULES[safeRole]}\nLearner age: ${safeAge ?? 'unknown'}. Subject: ${subject}. Curriculum: ${curriculum}.\n${levelRules[level]}\n${assessment ? 'ASSESSMENT MODE: assistance is restricted and must not undermine independent evidence.' : ''}\nDo not use multiple-choice-first teaching. Prefer authentic explanations, worked reasoning, writing, projects, oral/visual evidence, coding, reflection or other age-appropriate authentic tasks. Do not request unnecessary personal data.`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, role = 'learner', age, helpLevel: rawHelpLevel = 2, assessment = false, context = {} } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'A message is required' });
    if (message.length > 6000) return res.status(413).json({ error: 'Message too long' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Milo is temporarily unavailable' });

    const helpLevel = clampHelpLevel(rawHelpLevel);
    const system = buildSystem({ role, age, helpLevel, assessment: Boolean(assessment), context });
    const model = process.env.MILO_MODEL || 'openai/gpt-oss-120b';

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: message.trim() }
        ],
        max_tokens: 700,
        temperature: 0.4
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Milo upstream failure', upstream.status, data?.error?.message || 'unknown');
      return res.status(502).json({ error: 'Milo could not complete that request' });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: 'Milo returned an empty response' });

    return res.status(200).json({
      reply,
      meta: {
        role: ROLE_RULES[role] ? role : 'learner',
        helpLevel: assessment ? Math.min(helpLevel, 1) : helpLevel,
        assessment: Boolean(assessment)
      }
    });
  } catch (error) {
    console.error('Milo handler error', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({ error: 'Milo is temporarily unavailable' });
  }
}
