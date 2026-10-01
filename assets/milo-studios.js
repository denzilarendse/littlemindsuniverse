(function(){
const studios=[
  {
    id:'reasoning-missions',engine:'reasoning_missions',emoji:'🧩',title:'Reasoning Missions',
    ages:[5,18],subject:'Reasoning',
    intent:'reasoning mission try first think with milo retry prove it',
    description:'Try first, get one useful coaching move, retry, then prove the idea with a new example.',
    starter:'Give me a short reasoning mission for my current level. I will try first before you coach me.'
  },
  {
    id:'adaptive-practice',engine:'adaptive_practice',emoji:'🎯',title:'Adaptive Practice',
    ages:[5,18],subject:'Current curriculum',
    intent:'adaptive practice revision diagnose skill gap targeted practice',
    description:'Short targeted practice chosen around what you are learning and where you need more support.',
    starter:'Help me practise one current curriculum skill. Start with a quick diagnostic question, then adapt the next step.'
  },
  {
    id:'voice-language',engine:'voice_language',emoji:'🗣️',title:'Voice & Language Coach',
    ages:[3,18],subject:'Languages',
    intent:'language speaking listening pronunciation vocabulary voice coach',
    description:'Listen, repeat, speak and build vocabulary. Recording is available only with guardian permission.',
    starter:'Be my language coach. Give me one short phrase or sentence to practise, then ask me to say or explain it.'
  },
  {
    id:'ai-literacy',engine:'ai_literacy',emoji:'🤖',title:'AI Literacy Lab',
    ages:[8,18],subject:'AI literacy',
    intent:'AI literacy machine learning bias safety responsible use creative project',
    description:'Learn what AI can and cannot do, how data and bias matter, and how to use AI responsibly.',
    starter:'Teach me one age-appropriate AI literacy idea and give me a small safe activity to prove I understand it.'
  },
  {
    id:'coding-ai',engine:'coding_ai',emoji:'💻',title:'Coding & AI Builder',
    ages:[8,18],subject:'Coding',
    intent:'coding code debug algorithm javascript python project',
    description:'Plan, build and debug small projects. Milo guides your reasoning instead of writing assessed work for you.',
    starter:'Help me plan a small coding project. Ask what I want to build, then guide me one step at a time.'
  },
  {
    id:'brilliant-milo',engine:'brilliant_tutor',emoji:'✨',title:'Brilliant Milo Tutor',
    ages:[8,18],subject:'Current curriculum',
    intent:'brilliant tutor current curriculum live lesson guided tutoring',
    description:'A live curriculum tutor that teaches, models similar examples, watches your attempt and checks transfer.',
    starter:'Teach me the next idea in my curriculum. Diagnose what I know, explain it clearly, then make me try.'
  }
];

function byId(id){return studios.find(s=>s.id===id)||null}
function forAge(age){
  const n=Number(age);
  if(!Number.isFinite(n))return studios;
  return studios.filter(s=>n>=s.ages[0]&&n<=s.ages[1]);
}
window.LMU_STUDIOS=Object.freeze({
  studios:Object.freeze(studios.map(s=>Object.freeze({...s}))),
  byId,
  forAge
});
})();