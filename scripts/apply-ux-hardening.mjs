import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const write = (relative, text) => fs.writeFileSync(path.join(root, relative), text);

function replaceOnce(relative, before, after) {
  const current = read(relative);
  if (!current.includes(before)) throw new Error(`Expected text not found in ${relative}: ${before.slice(0, 100)}`);
  const next = current.replace(before, after);
  if (next === current) throw new Error(`Replacement made no change in ${relative}`);
  write(relative, next);
}

function replaceRegexOnce(relative, regex, after) {
  const current = read(relative);
  if (!regex.test(current)) throw new Error(`Expected pattern not found in ${relative}: ${regex}`);
  regex.lastIndex = 0;
  const next = current.replace(regex, after);
  if (next === current) throw new Error(`Regex replacement made no change in ${relative}`);
  write(relative, next);
}

const app = 'assets/app.js';

replaceRegexOnce(
  app,
  /const state=\{view:'home'[^\n]+?teacherDraft:\{classroomId:'',title:'',subject:'',instructions:'',help:2\}\};/,
  "const state={view:'home',stage:'discovery',role:'learner',language:'en',connected:false,mode:'demo',session:null,profile:null,learner:null,tasks:[],mastery:[],recommendations:[],teacherSubmissions:[],teacherSkills:[],reports:[],classrooms:[],messages:[],chat:[],miloLearningItemId:null,miloHelpLevel:2,miloPending:false,supabase:null,teacherDraft:{classroomId:'',title:'',subject:'',instructions:'',help:2}};"
);

replaceRegexOnce(
  app,
  /function demoReset\(\)\{[^\n]*\}/,
  "function demoReset(){state.mode='demo';state.connected=false;state.profile={...demo.profile,role:state.role};state.learner={...demo.learner,stage_code:stages[state.stage].code};state.tasks=structuredClone(demo.tasks);state.mastery=structuredClone(demo.mastery);state.recommendations=structuredClone(demo.recommendations);state.teacherSubmissions=[];state.teacherSkills=[];state.reports=structuredClone(demo.reports);state.classrooms=structuredClone(demo.classrooms);state.messages=structuredClone(demo.messages);state.chat=[];state.miloLearningItemId=null;state.miloHelpLevel=2;state.miloPending=false}"
);

replaceOnce(
  app,
  "state.mode='live';state.profile=profile;state.role=profile.role;state.language=profile.preferred_language||'en';",
  "const enteringLive=state.mode!=='live'||state.profile?.id!==profile.id;state.mode='live';state.profile=profile;state.role=profile.role;state.language=profile.preferred_language||'en';state.tasks=[];state.mastery=[];state.recommendations=[];state.teacherSubmissions=[];state.teacherSkills=[];state.reports=[];state.classrooms=[];state.messages=[];if(enteringLive){state.chat=[];state.miloLearningItemId=null;state.miloHelpLevel=2;state.miloPending=false}"
);

replaceOnce(app, '${state.classrooms.length||1}', '${state.classrooms.length}');

replaceRegexOnce(
  app,
  /function sidebar\(\)\{[^\n]*\}/,
  "function sidebar(){return `<nav class=\"sidebar\" aria-label=\"Primary navigation\">${nav.map(([id,label])=>`<button class=\"navbtn ${state.view===id?'active':''}\" data-view=\"${id}\" aria-current=\"${state.view===id?'page':'false'}\">${id==='messages'&&state.role==='learner'?'Notifications':label}</button>`).join('')}</nav>`}"
);

replaceOnce(app, "n===2?'selected':''", "Number(state.miloHelpLevel)===n?'selected':''");
replaceOnce(app, '<div class="chat" id="chatBox">', '<div class="chat" id="chatBox" aria-live="polite" aria-busy="${state.miloPending?\'true\':\'false\'}">');
replaceOnce(app, '<button class="primary" data-action="milo-send">Send to Milo</button>', '<button class="primary" data-action="milo-send" ${state.miloPending?\'disabled\':\'\'}>${state.miloPending?\'Milo is thinking…\':\'Send to Milo\'}</button>');

replaceRegexOnce(
  app,
  /function messages\(\)\{[^\n]*\}/,
  [
    "function messages(){",
    "  const rows=state.messages.length?state.messages.map(m=>`<div class=\"task\"><div><p>${esc(m.body)}</p><small class=\"muted\">${new Date(m.created_at).toLocaleString()}</small></div></div>`).join(''):'<div class=\"empty\">No notifications or messages yet.</div>';",
    "  if(state.role==='learner')return `<div class=\"card\"><div class=\"eyebrow\">Learner notifications</div><h2>Notifications</h2>${rows}<div class=\"notice\">Learner accounts receive teacher-approved notifications here. They do not have an in-app message composer.</div></div>`;",
    "  const composer=state.mode==='demo'?`<div class=\"field\"><textarea id=\"messageInput\" class=\"textarea\" placeholder=\"Write a demo message...\"></textarea></div><div class=\"actions\"><button class=\"primary\" data-action=\"send-message\">Add demo message</button></div>`:'<div class=\"notice\">Secure in-app message sending is not enabled in this release yet. No message will be reported as sent until server-side delivery is available.</div>';",
    "  return `<div class=\"grid two\"><div class=\"card\"><h2>In-app communication</h2>${rows}${composer}</div><div class=\"card\"><h2>WhatsApp mirror</h2><p>Only opted-in contacts receive privacy-minimised summaries and deep links from the central LittleMindsUniverse WhatsApp Business Platform number.</p><div class=\"notice warn\">No consumer WhatsApp groups and no automation of personal WhatsApp accounts.</div></div></div>`;",
    "}"
  ].join('\n')
);

replaceOnce(
  app,
  "document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.view==='milo'&&state.view!=='milo')state.miloLearningItemId=null;state.view=b.dataset.view;render()});",
  "document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const view=b.dataset.view;if(view==='milo'&&state.view!=='milo')state.miloLearningItemId=null;state.view=view;render();document.querySelector(`[data-view=\"${view}\"]`)?.focus()});"
);
replaceOnce(
  app,
  "document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{state.stage=b.dataset.stage;if(state.mode==='demo')state.learner.stage_code=stages[state.stage].code;render()});",
  "document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{const stage=b.dataset.stage;state.stage=stage;if(state.mode==='demo')state.learner.stage_code=stages[state.stage].code;render();document.querySelector(`[data-stage=\"${stage}\"]`)?.focus()});"
);
replaceOnce(
  app,
  "$('#rolePicker')?.addEventListener('change',e=>{state.role=e.target.value;state.profile.role=state.role;render()});",
  "$('#rolePicker')?.addEventListener('change',e=>{state.role=e.target.value;state.chat=[];state.miloLearningItemId=null;demoReset();render();$('#rolePicker')?.focus()});"
);
replaceOnce(
  app,
  "$('[data-action=\"milo-send\"]')?.addEventListener('click',sendMilo);",
  "$('[data-action=\"milo-send\"]')?.addEventListener('click',sendMilo);$('#miloHelp')?.addEventListener('change',e=>{const level=Number(e.target.value);if(Number.isInteger(level)&&level>=0&&level<=5)state.miloHelpLevel=level});"
);
replaceOnce(
  app,
  "$('#languagePicker')?.addEventListener('change',e=>{state.language=e.target.value;toast('Language preference updated')})",
  "const languagePicker=$('#languagePicker');if(languagePicker){languagePicker.value=state.language;languagePicker.addEventListener('change',e=>{state.language=e.target.value;toast(state.mode==='live'?'Language changed for this session':'Demo language changed')})}"
);
replaceOnce(
  app,
  "function render(){document.getElementById('app').innerHTML=`<div class=\"app\">${header()}<div class=\"layout\">${sidebar()}<main class=\"content\">${main()}<div class=\"footer\">LittleMindsUniverse · safe, teacher-led learning · country curriculum first · platform achievements are not accredited qualifications unless explicitly stated.</div></main></div></div>`;wire()}",
  "function render(){document.getElementById('app').innerHTML=`<div class=\"app\">${header()}<div class=\"layout\">${sidebar()}<main class=\"content\">${main()}<div class=\"footer\">LittleMindsUniverse · safe, teacher-led learning · country curriculum first · platform achievements are not accredited qualifications unless explicitly stated.</div></main></div></div>`;wire();const chat=$('#chatBox');if(chat)chat.scrollTop=chat.scrollHeight}"
);

replaceRegexOnce(
  app,
  /async function sendMilo\(\)\{[^\n]*\}\nfunction stageAge\(\)/,
  [
    "async function sendMilo(){",
    "  if(state.miloPending)return;",
    "  const input=$('#miloInput');",
    "  const message=input?.value.trim();",
    "  if(!message)return toast('Write a message first');",
    "  const requestedLevel=Number($('#miloHelp')?.value??state.miloHelpLevel??2);",
    "  state.miloHelpLevel=Number.isInteger(requestedLevel)&&requestedLevel>=0&&requestedLevel<=5?requestedLevel:2;",
    "  const learningItemId=state.miloLearningItemId||null;",
    "  state.chat.push({who:'user',text:message});",
    "  state.miloPending=true;",
    "  render();",
    "  const token=state.session?.access_token;",
    "  if(state.mode!=='live'||!token){state.chat.push({who:'milo',text:'Sign in to use live Milo. Demo mode does not send your message to the AI provider.'});state.miloPending=false;return render()}",
    "  try{",
    "    const res=await fetch(`${cfg.apiBase}/api/milo`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({message,age:stageAge(),helpLevel:state.miloHelpLevel,learningItemId,context:{curriculum:state.learner?.curriculum_code||cfg.defaultCurriculum,subject:'current learning'}})});",
    "    const body=await res.json();",
    "    if(!res.ok)throw new Error(body.error||'Milo unavailable');",
    "    state.chat.push({who:'milo',text:body.reply});",
    "  }catch(e){",
    "    console.error('Milo request failed',e);",
    "    state.chat.push({who:'milo',text:'Milo could not connect just now. Please try again in a moment. Your message was not treated as an academic answer.'});",
    "  }finally{",
    "    state.miloPending=false;",
    "    render();",
    "  }",
    "}",
    "function stageAge()"
  ].join('\n')
);

replaceRegexOnce(
  app,
  /function sendMessage\(\)\{[^\n]*\}/,
  [
    "function sendMessage(){",
    "  if(state.role==='learner')return toast('Learner accounts receive notifications but cannot send messages.');",
    "  const v=$('#messageInput')?.value.trim();",
    "  if(!v)return toast('Write a message first');",
    "  if(state.mode==='live')return toast('Secure in-app sending is not enabled yet. No message was sent.');",
    "  state.messages.push({id:'m'+Date.now(),body:v,created_at:new Date().toISOString()});",
    "  toast('Demo message added on this device');",
    "  render();",
    "}"
  ].join('\n')
);

replaceOnce(
  app,
  "if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));",
  "if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('Service worker registration failed',error)));"
);

replaceOnce('index.html', '<div id="app" aria-live="polite"></div>', '<div id="app"></div>');

const cssAppend = `\n\n/* === LMU END-USER FRICTION HARDENING === */\nbutton:disabled{opacity:.62;cursor:wait}\nbutton:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--brand);outline-offset:3px}\n@media(max-width:680px){\n  button,.pill,.ghost,.primary,.danger,.tiny,.navbtn,.select,.input,.textarea{min-height:44px}\n}\n`;
const css = read('assets/app.css');
if (!css.includes('LMU END-USER FRICTION HARDENING')) write('assets/app.css', css + cssAppend);

replaceOnce(
  'scripts/build.mjs',
  'NINEROUTER_API_KEY)\\s*[:=]',
  'NINEROUTER_API_KEY|GROQ_API_KEY)\\s*[:=]'
);

console.log('Applied LittleMindsUniverse end-user friction hardening changes.');
