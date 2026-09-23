import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
function once(p,b,a){const s=read(p);if(!s.includes(b))throw new Error(`missing text in ${p}: ${b.slice(0,120)}`);const n=s.replace(b,a);if(n===s)throw new Error(`no change ${p}`);write(p,n)}
function rx(p,r,a){const s=read(p);if(!r.test(s))throw new Error(`missing pattern in ${p}: ${r}`);r.lastIndex=0;const n=s.replace(r,a);if(n===s)throw new Error(`no regex change ${p}`);write(p,n)}
const p='assets/app.js';

once(p,
"classrooms:[],messages:[],chat:[]",
"classrooms:[],messages:[],messageThreads:[],messageContacts:[],threadMessages:[],activeThreadId:null,chat:[]");

once(p,
"state.classrooms=structuredClone(demo.classrooms);state.messages=structuredClone(demo.messages);state.chat=[];",
"state.classrooms=structuredClone(demo.classrooms);state.messages=structuredClone(demo.messages);state.messageThreads=[];state.messageContacts=[];state.threadMessages=[];state.activeThreadId=null;state.chat=[];");

once(p,
"state.reports=[];state.classrooms=[];state.messages=[];state.learners=[];",
"state.reports=[];state.classrooms=[];state.messages=[];state.messageThreads=[];state.messageContacts=[];state.threadMessages=[];state.activeThreadId=null;state.learners=[];");

once(p,
"await loadRoleData();if(profile.role==='teacher')",
"await loadRoleData();if(['parent','teacher'].includes(profile.role))await refreshMessaging();if(profile.role==='teacher')");

const oldMessages=/function messages\(\)\{[\s\S]*?\n\}\nfunction settings\(\)/;
const newMessages=`async function refreshMessaging(){
  if(state.mode!=='live'||!state.supabase||!['parent','teacher'].includes(state.role)){state.messageThreads=[];state.messageContacts=[];state.threadMessages=[];state.activeThreadId=null;return}
  const [{data:threads,error:threadError},{data:contacts,error:contactError}]=await Promise.all([
    state.supabase.rpc('get_my_message_threads'),
    state.supabase.rpc('get_message_contacts')
  ]);
  if(threadError){console.error('Message thread load failed',threadError);state.messageThreads=[]}else state.messageThreads=threads||[];
  if(contactError){console.error('Message contact load failed',contactError);state.messageContacts=[]}else state.messageContacts=contacts||[];
  if(state.activeThreadId&&!state.messageThreads.some(t=>String(t.thread_id)===String(state.activeThreadId))){state.activeThreadId=null;state.threadMessages=[]}
}
async function openMessageThread(threadId){
  if(state.mode!=='live'||!state.supabase||!['parent','teacher'].includes(state.role))return toast('Secure messaging requires a parent or teacher account');
  const thread=state.messageThreads.find(t=>String(t.thread_id)===String(threadId));
  if(!thread)return toast('That conversation is no longer available');
  const {data,error}=await state.supabase.rpc('get_thread_messages',{p_thread_id:thread.thread_id});
  if(error){console.error('Message load failed',error);return toast('Conversation could not be loaded. Please try again.')}
  state.activeThreadId=thread.thread_id;state.threadMessages=data||[];await refreshMessaging();render();setTimeout(()=>$('#messageInput')?.focus(),0)
}
async function startMessageContact(classroomId,learnerId,guardianId,button){
  if(state.mode!=='live'||!state.supabase||!['parent','teacher'].includes(state.role))return toast('Secure messaging requires a parent or teacher account');
  if(button?.disabled)return;if(button){button.disabled=true;button.textContent='Opening…'}
  try{
    const {data,error}=await state.supabase.rpc('get_or_create_message_thread',{p_classroom_id:classroomId,p_learner_id:learnerId,p_guardian_profile_id:guardianId||null});
    if(error)throw error;
    await refreshMessaging();
    await openMessageThread(data);
  }catch(error){console.error('Conversation open failed',error);toast('Conversation could not be opened. Check that classroom communication is still allowed.')}finally{if(button?.isConnected){button.disabled=false;button.textContent='Open'}}
}
function messages(){
  const demoRows=state.messages.length?state.messages.map(m=>\`<div class="task"><div><p>\${esc(m.body)}</p><small class="muted">\${new Date(m.created_at).toLocaleString()}</small></div></div>\`).join(''):'<div class="empty">No notifications or messages yet.</div>';
  if(state.role==='learner')return \`<div class="card"><div class="eyebrow">Learner notifications</div><h2>Notifications</h2>\${demoRows}<div class="notice">Learner accounts receive teacher-approved notifications here. They do not have an in-app message composer.</div></div>\`;
  if(state.role==='admin')return '<div class="card"><h2>Messaging</h2><div class="notice">Class messaging is available only to the verified teacher and guardian participants for a learner.</div></div>';
  if(state.mode!=='live')return \`<div class="grid two"><div class="card"><h2>Demo communication</h2>\${demoRows}<div class="field"><label for="messageInput">Demo message</label><textarea id="messageInput" class="textarea" maxlength="4000" placeholder="Write a demo message..."></textarea></div><div class="actions"><button class="primary" data-action="send-message">Add demo message</button></div></div><div class="card"><h2>WhatsApp mirror</h2><div class="notice warn">Demo mode never sends WhatsApp or production messages.</div></div></div>\`;
  const threadRows=state.messageThreads.length?state.messageThreads.map(t=>{const counterpart=state.role==='teacher'?t.guardian_name:t.teacher_name;const unread=Number(t.unread_count||0);return \`<button class="task ghost" style="width:100%;text-align:left" data-message-thread="\${esc(t.thread_id)}"><div><b>\${esc(counterpart||'Conversation')}</b><p>\${esc(t.learner_name||'Learner')} · \${esc(t.classroom_name||'Classroom')}</p><small class="muted">\${t.last_message?esc(t.last_message):'No messages yet'}\${unread?\` · \${unread} unread\`:''}</small></div></button>\`}).join(''):'<div class="empty">No conversations yet.</div>';
  const contactRows=state.messageContacts.length?state.messageContacts.map(c=>{const counterpart=state.role==='teacher'?c.guardian_name:c.teacher_name;return \`<div class="task"><div><b>\${esc(counterpart||'Contact')}</b><p>\${esc(c.learner_name||'Learner')} · \${esc(c.classroom_name||'Classroom')}</p></div><button class="ghost" data-start-message-contact data-classroom-id="\${esc(c.classroom_id)}" data-learner-id="\${esc(c.learner_id)}" data-guardian-id="\${state.role==='teacher'?esc(c.guardian_profile_id||''):''}">Open</button></div>\`}).join(''):'<div class="empty">No eligible classroom contacts are available.</div>';
  const active=state.messageThreads.find(t=>String(t.thread_id)===String(state.activeThreadId));
  const conversation=active?state.threadMessages.map(m=>\`<div class="bubble \${m.sent_by_me?'user':'milo'}"><b>\${esc(m.sent_by_me?'You':m.sender_name||'Participant')}</b><br>\${esc(m.body)}<br><small class="muted">\${new Date(m.created_at).toLocaleString()}</small></div>\`).join(''):'';
  const activePane=active?\`<div class="split"><div><div class="eyebrow">Secure class conversation</div><h2>\${esc(state.role==='teacher'?active.guardian_name:active.teacher_name)}</h2><p class="muted">\${esc(active.learner_name)} · \${esc(active.classroom_name)}</p></div></div><div class="chat" id="messageThread" aria-live="polite">\${conversation||'<div class="empty">No messages yet.</div>'}</div><div class="field"><label for="messageInput">Message</label><textarea id="messageInput" class="textarea" maxlength="4000" placeholder="Write a class message..."></textarea><small class="muted">Visible only to the verified teacher and guardian participants for this learner.</small></div><div class="actions"><button class="primary" data-action="send-message">Send message</button></div>\`:'<div class="empty">Choose a conversation or open an eligible classroom contact.</div>';
  return \`<div class="grid two"><div><div class="card"><div class="eyebrow">Existing conversations</div><h2>Messages</h2>\${threadRows}</div><div class="card" style="margin-top:14px"><div class="eyebrow">Eligible classroom contacts</div><h2>Start or reopen</h2>\${contactRows}</div></div><div class="card">\${activePane}<div class="notice" style="margin-top:14px">Private teacher and guardian phone numbers are never exposed. WhatsApp, when enabled, is a separate privacy-minimised mirror through the LittleMindsUniverse business identity.</div></div></div>\`;
}
function settings()`;
rx(p,oldMessages,newMessages);

once(p,
"$('[data-action=\"send-message\"]')?.addEventListener('click',sendMessage);document.querySelectorAll('[data-manage-class]')",
"$('[data-action=\"send-message\"]')?.addEventListener('click',sendMessage);document.querySelectorAll('[data-message-thread]').forEach(b=>b.onclick=()=>openMessageThread(b.dataset.messageThread));document.querySelectorAll('[data-start-message-contact]').forEach(b=>b.onclick=()=>startMessageContact(b.dataset.classroomId,b.dataset.learnerId,b.dataset.guardianId||null,b));document.querySelectorAll('[data-manage-class]')");

rx(p,/function sendMessage\(\)\{[\s\S]*?\n\}\nif\('serviceWorker'/,
`async function sendMessage(){
  if(state.role==='learner')return toast('Learner accounts receive notifications but cannot send messages.');
  const input=$('#messageInput');const body=input?.value.trim();if(!body)return toast('Write a message first');if(body.length>4000)return toast('Messages may contain at most 4000 characters.');
  if(state.mode!=='live'){state.messages.push({id:'m'+Date.now(),body,created_at:new Date().toISOString()});toast('Demo message added on this device');return render()}
  if(!['parent','teacher'].includes(state.role)||!state.activeThreadId)return toast('Choose an authorized conversation first');
  const button=$('[data-action="send-message"]');if(button?.disabled)return;if(button){button.disabled=true;button.textContent='Sending…'}
  try{
    const {error}=await state.supabase.rpc('send_thread_message',{p_thread_id:state.activeThreadId,p_body:body});
    if(error)throw error;
    if(input)input.value='';
    await openMessageThread(state.activeThreadId);
    toast('Message sent securely');
  }catch(error){console.error('Secure message send failed',error);toast('Message was not sent. Please try again.')}finally{if(button?.isConnected){button.disabled=false;button.textContent='Send message'}}
}
if('serviceWorker'`);

const test=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');\n\ntest('live messaging uses only authorization-aware RPCs',()=>{\n  for(const name of ['get_my_message_threads','get_message_contacts','get_or_create_message_thread','get_thread_messages','send_thread_message'])assert.match(app,new RegExp(\\`rpc\\\\('\\${name}'\\`));\n  assert.doesNotMatch(app,/from\\('classroom_messages'\\)\\.insert/);\n  assert.doesNotMatch(app,/from\\('classroom_message_threads'\\)\\.insert/);\n});\n\ntest('learner accounts remain notification-only',()=>{\n  assert.match(app,/Learner accounts receive teacher-approved notifications here/);\n  assert.match(app,/Learner accounts receive notifications but cannot send messages/);\n});\n\ntest('live composer is thread-bound, length limited, and duplicate-send guarded',()=>{\n  assert.match(app,/maxlength="4000"/);\n  assert.match(app,/!state\\.activeThreadId/);\n  assert.match(app,/button\\?\\.disabled/);\n  assert.match(app,/Message was not sent\. Please try again\./);\n});\n\ntest('contact IDs are inputs to server authorization, not client authority',()=>{\n  assert.match(app,/data-classroom-id/);\n  assert.match(app,/data-learner-id/);\n  assert.match(app,/data-guardian-id/);\n  assert.match(app,/get_or_create_message_thread/);\n});\n`;
write('tests/messaging-ui.test.mjs',test);
console.log('Applied secure messaging UI hardening.');
