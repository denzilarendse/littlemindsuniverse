// Milo 8-Engine Shared Intelligence Architecture - Phase 4 Section 2
// Extends api/milo.js without weakening existing security
// Teacher-only mastery approval, prod READ-ONLY, evidence boundary preserved

export const ENGINE_DEFINITIONS = [
  {
    code: 'BRILLIANT_TUTOR',
    name: 'Brilliant Milo Tutor',
    ages: '2-18',
    description: 'Core safe educational tutor - teach rather than complete work, diagnose misconceptions, hints and explanations',
    allowedRoles: ['learner','teacher','parent','admin'],
    evidenceType: 'tutor_interaction',
    requiresTeacherApproval: false,
    helpLevels: [0,1,2,3,4,5]
  },
  {
    code: 'ADAPTIVE_PRACTICE',
    name: 'Adaptive Practice',
    ages: '5-18',
    description: 'Personalized practice adapting to mastery estimate, evidence count, confidence, independent vs assisted',
    allowedRoles: ['learner','teacher'],
    evidenceType: 'practice_attempt',
    requiresTeacherApproval: false,
    helpLevels: [0,1,2,3,4],
    adaptsOn: ['mastery_estimate','evidence_count','confidence','misconception_tags']
  },
  {
    code: 'REASONING_MISSIONS',
    name: 'Reasoning Missions',
    ages: '8-18',
    description: 'Structured reasoning tasks requiring explanation, justification, multi-step thinking',
    allowedRoles: ['learner','teacher'],
    evidenceType: 'reasoning_evidence',
    requiresTeacherApproval: true,
    helpLevels: [0,1,2,3],
    protectsAssessment: true
  },
  {
    code: 'EARLY_LEARNING',
    name: 'Early Learning Intelligence',
    ages: '2-7',
    description: 'Early Explorers 2-4 and Foundation 5-7: extremely short warm sentences, concrete words, playful, one idea at a time <60-100 words',
    allowedRoles: ['learner','teacher','parent'],
    evidenceType: 'early_evidence',
    requiresTeacherApproval: false,
    helpLevels: [0,1,2],
    wordLimit: { '2-4': 60, '5-7': 100 },
    stageGuidance: 'Early Explorers 2-4 and Foundation 5-7'
  },
  {
    code: 'PLAY_STORY',
    name: 'Play & Story Intelligence',
    ages: '2-10',
    description: 'Play-based and narrative learning, story creation, imaginative evidence',
    allowedRoles: ['learner','teacher','parent'],
    evidenceType: 'play_story_evidence',
    requiresTeacherApproval: false,
    helpLevels: [0,1,2,3],
    evidenceKinds: ['written','oral','visual','whiteboard']
  },
  {
    code: 'VOICE_LANGUAGE',
    name: 'Voice & Language Intelligence',
    ages: '2-18',
    description: 'Voice, language, reading aloud, transcription, multilingual support with parent consent boundary',
    allowedRoles: ['learner','teacher','parent'],
    evidenceType: 'voice_language_evidence',
    requiresTeacherApproval: false,
    helpLevels: [0,1,2,3,4],
    requiresConsent: ['milo_read_aloud','audio_playback','camera','transcription'],
    languages: ['en','af','zu','xh','st','nso','tn','ss','ve','ts','nr','sasl']
  },
  {
    code: 'AI_LITERACY',
    name: 'AI Literacy & Creativity',
    ages: '8-18',
    description: 'AI literacy, creativity, portfolios, full-stack, enterprise, ethical AI use',
    allowedRoles: ['learner','teacher','parent','admin'],
    evidenceType: 'ai_literacy_evidence',
    requiresTeacherApproval: false,
    helpLevels: [1,2,3,4,5],
    focus: 'Full-stack portfolios, finance, enterprise, AI literacy and career pathways'
  },
  {
    code: 'CODING_BUILDER',
    name: 'Coding & AI Builder',
    ages: '8-18',
    description: 'Coding, AI builder, projects, code evidence, whiteboard working, authentic tasks',
    allowedRoles: ['learner','teacher'],
    evidenceType: 'coding_evidence',
    requiresTeacherApproval: true,
    helpLevels: [0,1,2,3,4,5],
    evidenceKinds: ['code','whiteboard','written','project']
  }
];

// Shared contract - common input/output/context/evidence rules
export function createEngineContext({ trusted, profile, age, curriculum, subject }) {
  return {
    learnerId: trusted.learnerId || null,
    learningItemId: trusted.learningItemId || null,
    assessment: Boolean(trusted.assessment),
    helpLevel: trusted.level ?? 2,
    role: profile.role,
    age: age,
    curriculum: curriculum || 'CAPS',
    subject: subject || 'general learning',
    timestamp: new Date().toISOString(),
    // Evidence boundary - distinguishes learner attempts, AI assistance, teacher-reviewed
    evidenceBoundary: {
      learnerAttempt: true,
      aiAssistance: true,
      teacherReviewed: false,
      masteryApproved: false // HUMAN ONLY - never AI
    }
  };
}

export function validateEngineRequest(engineCode, context) {
  const engine = ENGINE_DEFINITIONS.find(e => e.code === engineCode);
  if (!engine) throw new Error(`Unknown engine: ${engineCode}`);
  if (!engine.allowedRoles.includes(context.role)) {
    throw new Error(`Role ${context.role} not allowed for engine ${engineCode}`);
  }
  // Age validation
  if (engine.ages) {
    const [min, max] = engine.ages.split('-').map(n => parseInt(n));
    if (context.age !== 'unknown' && (context.age < min || context.age > max)) {
      // Allow but warn - age guidance, not hard block
      console.warn(`Age ${context.age} outside engine ${engineCode} recommended ${engine.ages}`);
    }
  }
  // Help level validation
  if (engine.helpLevels && !engine.helpLevels.includes(context.helpLevel)) {
    throw new Error(`Help level ${context.helpLevel} not allowed for engine ${engineCode}`);
  }
  return true;
}

// Evidence boundary - never allow AI to approve mastery
export function assertTeacherOnlyMastery(context, action) {
  if (action === 'approve_mastery' || action === 'mastery_approved') {
    if (context.role !== 'teacher') {
      throw new Error('Mastery approval requires authenticated human teacher - HUMAN ONLY');
    }
    if (context.evidenceBoundary) {
      context.evidenceBoundary.masteryApproved = true;
      context.evidenceBoundary.teacherReviewed = true;
    }
  }
  return context;
}

export function getEngineByCode(code) {
  return ENGINE_DEFINITIONS.find(e => e.code === code) || null;
}

export function listEngines() {
  return ENGINE_DEFINITIONS.map(e => ({ code: e.code, name: e.name, ages: e.ages }));
}
