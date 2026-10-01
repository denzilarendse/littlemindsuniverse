const ENGINE_IDS=Object.freeze([
  'early_learning','play_story','ai_literacy','reasoning_missions',
  'voice_language','adaptive_practice','coding_ai','brilliant_tutor'
]);

const STAGES=Object.freeze({
  EE24:{code:'EE24',label:'Early Explorers',min:2,max:4},
  F57:{code:'F57',label:'Foundation',min:5,max:7},
  DB810:{code:'DB810',label:'Discovery Builders',min:8,max:10},
  CA1113:{code:'CA1113',label:'Creator Academy',min:11,max:13},
  PA1415:{code:'PA1415',label:'Pathfinder Academy',min:14,max:15},
  EDGE1618:{code:'EDGE1618',label:'LittleMinds Edge',min:16,max:18}
});

const ENGINE_GUIDANCE=Object.freeze({
  early_learning:'Use one idea at a time, concrete language, playful examples, praise effort, and keep the interaction short. Prefer pointing, counting, matching, movement, drawing, sound and spoken response over typing.',
  play_story:'Use a short interactive story or playful challenge with bounded choices that teach the curriculum idea. Do not invent personal details about the child and do not turn the session into endless entertainment.',
  ai_literacy:'Teach what AI can and cannot do, safe/responsible use, bias, data, machine learning and creative project thinking at the learner\'s stage. Never encourage bypassing school rules or safety controls.',
  reasoning_missions:'Use Try First -> Think With Milo -> Try Again -> Prove It. Require a first attempt when appropriate, give one bounded coaching move, then check transfer with a new variation.',
  voice_language:'Focus on age-appropriate vocabulary, listening, pronunciation and conversational production. Keep corrections supportive and brief. Do not claim clinical speech-therapy outcomes.',
  adaptive_practice:'Target one diagnosed skill gap at a time. Prefer retrieval, spacing, contrast examples and short practice. Treat adaptation as a recommendation signal, not a teacher-approved mastery judgement.',
  coding_ai:'Guide planning, debugging and explanation. Never provide a complete assessed solution when the learner should create it. Prefer small runnable examples that differ from the learner\'s target task.',
  brilliant_tutor:'Act like a tutor who can see permitted current-work context. Diagnose where thinking broke down, ask a useful question, manipulate only approved learning tools, and never simply reveal the target answer.'
});

function clampHelp(value){
  const n=Number(value);
  return Number.isInteger(n)&&n>=0&&n<=5?n:2;
}

function normalizeStage(stageCode,age){
  const code=String(stageCode||'').trim().toUpperCase();
  if(STAGES[code])return STAGES[code];
  const n=Number(age);
  if(Number.isFinite(n)){
    if(n<=4)return STAGES.EE24;
    if(n<=7)return STAGES.F57;
    if(n<=10)return STAGES.DB810;
    if(n<=13)return STAGES.CA1113;
    if(n<=15)return STAGES.PA1415;
    return STAGES.EDGE1618;
  }
  return STAGES.DB810;
}

function normalizeSessionMode(value,{assessment=false}={}){
  if(assessment)return 'assessment';
  const mode=String(value||'learn').toLowerCase();
  return ['learn','practice','project'].includes(mode)?mode:'learn';
}

function textBlob(...values){
  return values.filter(Boolean).join(' ').toLowerCase().slice(0,1200);
}

function selectMiloEngine({stageCode,age,subject,message,intent,assessment=false}={}){
  const stage=normalizeStage(stageCode,age);
  const text=textBlob(subject,message,intent);

  if(stage.code==='EE24'){
    if(/story|tale|pretend|creative|draw|picture|colour|color/.test(text))return 'play_story';
    return 'early_learning';
  }

  if(/language|english|afrikaans|isizulu|isixhosa|sesotho|sepedi|setswana|pronounc|vocabulary|speaking|listening/.test(text)){
    return 'voice_language';
  }
  if(/coding|code|javascript|python|html|css|program|debug|algorithm|scratch/.test(text)){
    return 'coding_ai';
  }
  if(/artificial intelligence|\bai\b|machine learning|computer vision|bias|prompt engineering/.test(text)){
    return 'ai_literacy';
  }
  if(assessment||/reason|logic|prove|explain why|word problem|mission/.test(text)){
    return 'reasoning_missions';
  }
  if(/practice|revision|revise|weak|mistake|struggl|again|drill/.test(text)){
    return 'adaptive_practice';
  }
  if(stage.code==='F57')return 'adaptive_practice';
  return 'brilliant_tutor';
}

function buildTutorPolicy({assessment=false,helpLevel=2,stageCode,age}={}){
  const stage=normalizeStage(stageCode,age);
  const level=assessment?Math.min(clampHelp(helpLevel),1):clampHelp(helpLevel);
  return {
    directAnswerPolicy:assessment||level<5?'guided_only':'post_submission_review',
    assessmentMode:Boolean(assessment),
    maxAssistanceLevel:level,
    requireFirstAttempt:assessment||level<=4,
    requireTransferCheck:true,
    teacherApprovalRequired:true,
    stageCode:stage.code,
    stageLabel:stage.label,
    boundedSession:stage.code==='EE24'||stage.code==='F57'
  };
}

function engineGuidance(engine){
  return ENGINE_GUIDANCE[ENGINE_IDS.includes(engine)?engine:'brilliant_tutor'];
}

export {
  ENGINE_IDS, STAGES, clampHelp, normalizeStage, normalizeSessionMode,
  selectMiloEngine, buildTutorPolicy, engineGuidance
};
