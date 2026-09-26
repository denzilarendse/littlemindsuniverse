(function(){
  const cfg=window.LMU_CONFIG;
  const root=document.querySelector('#connectApp');
  const toastNode=document.querySelector('#toast');

  const state={
    client:null,
    session:null,
    profile:null,
    threads:[],
    contacts:[],
    messages:[],
    activeConversationId:null,
    replyTo:null,
    channel:null,
    loading:false,
    sending:false
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const short=value=>{
    const text=String(value||'').trim();
    return text.length>72?text.slice(0,69)+'…':text;
  };

  function toast(message){
    if(!toastNode)return;
    toastNode.textContent=message;
    toastNode.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>toastNode.classList.remove('show'),2600);
  }

  function initials(name){
    const parts=String(name||'Connect').trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0,2).map(part=>part[0]).join('')||'LC').toUpperCase();
  }

  function counterpart(thread){
    if(!thread)return 'Conversation';
    return state.profile?.role==='teacher'
      ? thread.guardian_name||'Guardian'
      : thread.teacher_name||'Teacher';
  }

  function threadById(id){
    return state.threads.find(thread=>String(thread.conversation_id)===String(id))||null;
  }

  function messageById(id){
    return state.messages.find(message=>String(message.message_id)===String(id))||null;
  }

  function resetMessaging(){
    state.threads=[];
    state.contacts=[];
    state.messages=[];
    state.activeConversationId=null;
    state.replyTo=null;
    unsubscribeRealtime();
  }

  function unsubscribeRealtime(){
    if(state.channel&&state.client){
      state.client.removeChannel(state.channel).catch(()=>{});
    }
    state.channel=null;
  }

  function authorizedMessagingRole(){
    return ['parent','teacher'].includes(state.profile?.role);
  }

  async function loadIdentity(){
    if(!state.session?.user?.id){state.profile=null;resetMessaging();return}
    const {data,error}=await state.client.from('profiles')
      .select('id,role,display_name')
      .eq('id',state.session.user.id)
      .maybeSingle();
    if(error)throw error;
    state.profile=data||null;
    resetMessaging();
    if(authorizedMessagingRole())await refreshConnect();
  }

  async function refreshConnect(){
    if(!authorizedMessagingRole())return;
    const [{data:threads,error:threadError},{data:contacts,error:contactError}]=await Promise.all([
      state.client.rpc('get_connect_threads'),
      state.client.rpc('get_connect_contacts')
    ]);
    if(threadError)throw threadError;
    if(contactError)throw contactError;
    state.threads=threads||[];
    state.contacts=contacts||[];
    if(state.activeConversationId&&!threadById(state.activeConversationId)){
      state.activeConversationId=null;
      state.messages=[];
      state.replyTo=null;
      unsubscribeRealtime();
    }
  }

  async function loadActiveMessages({markRead=true}={}){
    const id=state.activeConversationId;
    if(!id)return;
    const {data,error}=await state.client.rpc('get_connect_messages',{p_conversation_id:id});
    if(error)throw error;
    if(String(state.activeConversationId)!==String(id))return;
    state.messages=data||[];
    if(markRead){
      const {error:readError}=await state.client.rpc('mark_connect_thread_read',{p_conversation_id:id});
      if(readError)throw readError;
    }
  }

  async function openConversation(id){
    if(!authorizedMessagingRole())return toast('This account cannot open Connect classroom conversations.');
    if(state.loading)return;
    state.loading=true;
    state.activeConversationId=id;
    state.replyTo=null;
    render();
    try{
      await loadActiveMessages();
      await refreshConnect();
      subscribeRealtime(id);
      render();
      scrollMessages();
    }catch(error){
      console.error('Connect conversation load failed',error);
      toast('Conversation could not be loaded. Your access may have changed.');
      state.activeConversationId=null;
      state.messages=[];
      unsubscribeRealtime();
      render();
    }finally{
      state.loading=false;
    }
  }

  function subscribeRealtime(conversationId){
    unsubscribeRealtime();
    if(!conversationId||!state.client)return;
    state.channel=state.client
      .channel(`connect:${conversationId}:${Date.now()}`)
      .on('postgres_changes',{
        event:'INSERT',
        schema:'public',
        table:'connect_messages',
        filter:`conversation_id=eq.${conversationId}`
      },async()=>{
        if(String(state.activeConversationId)!==String(conversationId))return;
        try{
          await loadActiveMessages();
          await refreshConnect();
          render();
          scrollMessages();
        }catch(error){
          console.error('Connect realtime refresh failed',error);
        }
      })
      .subscribe(status=>{
        if(status==='CHANNEL_ERROR')console.warn('Connect realtime channel unavailable; manual refresh remains available.');
      });
  }

  async function startContact(contact,button){
    if(!authorizedMessagingRole()||button?.disabled)return;
    if(button){button.disabled=true;button.textContent='Opening…'}
    try{
      const guardianId=state.profile.role==='teacher'?contact.guardian_profile_id:null;
      const {data,error}=await state.client.rpc('get_or_create_connect_classroom_conversation',{
        p_classroom_id:contact.classroom_id,
        p_learner_id:contact.learner_id,
        p_guardian_profile_id:guardianId
      });
      if(error)throw error;
      await refreshConnect();
      await openConversation(data);
    }catch(error){
      console.error('Connect conversation creation failed',error);
      toast('Conversation could not be opened. Verified classroom access is required.');
    }finally{
      if(button?.isConnected){button.disabled=false;button.textContent='Open'}
    }
  }

  async function sendMessage(button){
    if(state.sending||!authorizedMessagingRole()||!state.activeConversationId)return;
    const input=document.querySelector('#connectComposer');
    const body=input?.value.trim()||'';
    if(!body)return toast('Write a message first.');
    if(body.length>4000)return toast('Messages may contain at most 4000 characters.');
    state.sending=true;
    if(button){button.disabled=true;button.textContent='Sending…'}
    try{
      const {error}=await state.client.rpc('send_connect_message',{
        p_conversation_id:state.activeConversationId,
        p_body:body,
        p_reply_to_message_id:state.replyTo?.message_id||null
      });
      if(error)throw error;
      state.replyTo=null;
      if(input)input.value='';
      await loadActiveMessages({markRead:false});
      await refreshConnect();
      render();
      scrollMessages();
    }catch(error){
      console.error('Connect send failed',error);
      toast('Message was not sent. Access is checked again for every send.');
    }finally{
      state.sending=false;
      if(button?.isConnected){button.disabled=false;button.textContent='Send'}
    }
  }

  async function manualRefresh(button){
    if(button?.disabled)return;
    if(button){button.disabled=true;button.textContent='Refreshing…'}
    try{
      await refreshConnect();
      if(state.activeConversationId)await loadActiveMessages();
      render();
      scrollMessages();
    }catch(error){
      console.error('Connect refresh failed',error);
      toast('Connect could not refresh just now.');
    }finally{
      if(button?.isConnected){button.disabled=false;button.textContent='Refresh'}
    }
  }

  async function signIn(form,button){
    if(button.disabled)return;
    const email=form.querySelector('#connectEmail')?.value.trim()||'';
    const password=form.querySelector('#connectPassword')?.value||'';
    if(!email||!password)return toast('Enter your email and password.');
    button.disabled=true;button.textContent='Signing in…';
    try{
      const {error}=await state.client.auth.signInWithPassword({email,password});
      if(error)throw error;
    }catch(error){
      console.error('Connect sign in failed',error);
      toast(error?.message||'Sign in failed.');
    }finally{
      if(button.isConnected){button.disabled=false;button.textContent='Sign in'}
    }
  }

  async function signOut(button){
    if(button?.disabled)return;
    if(button){button.disabled=true;button.textContent='Signing out…'}
    try{await state.client.auth.signOut()}catch(error){
      console.error('Connect sign out failed',error);
      toast('Sign out failed. Please try again.');
    }
  }

  function topbar(){
    const signed=!!state.session;
    const role=state.profile?.role||'';
    return `<header class="connect-topbar">
      <a class="connect-brand" href="/connect.html" aria-label="LittleMinds Connect home">
        <span class="connect-brand-mark">LC</span>
        <span class="connect-brand-copy"><strong>LittleMinds Connect</strong><small>Private family & school messaging</small></span>
      </a>
      <div class="connect-actions">
        ${signed?`<span class="connect-status"><i class="live"></i>${esc(state.profile?.display_name||'Signed in')}${role?` · ${esc(role)}`:''}</span>`:''}
        <a class="pill" href="/">Learning app</a>
        ${signed?'<button class="ghost" id="connectSignOut">Sign out</button>':''}
      </div>
    </header>`;
  }

  function authView(){
    return `<main class="connect-main"><section class="connect-auth">
      <div class="eyebrow">LittleMinds Connect</div>
      <h1>Sign in</h1>
      <p>Use your LittleMindsUniverse account. Connect classroom messaging does not require a premium lesson subscription; access comes from your verified school or family relationship.</p>
      <form id="connectAuthForm">
        <div class="field"><label for="connectEmail">Email</label><input class="input" id="connectEmail" type="email" autocomplete="email" required></div>
        <div class="field"><label for="connectPassword">Password</label><input class="input" id="connectPassword" type="password" autocomplete="current-password" required></div>
        <div class="actions"><a class="ghost" href="/">Create or manage account</a><button class="primary" id="connectSignIn">Sign in</button></div>
      </form>
      <div class="notice" style="margin-top:16px">Private phone numbers are never required or exposed by Connect.</div>
    </section></main>`;
  }

  function roleBlockedView(){
    const role=state.profile?.role||'account';
    const learner=role==='learner';
    return `<main class="connect-main"><section class="connect-role-note">
      <div class="eyebrow">Safety by relationship</div>
      <h1>${learner?'Learner communication is protected':'Connect access is role-scoped'}</h1>
      <p>${learner?'Learner accounts do not currently have an unrestricted message composer. Teacher-approved learner notifications remain available in LittleMindsUniverse while age-safe messaging is developed and tested.':'This account does not currently have an eligible classroom messaging role. Connect Business and organization workflows will use separate verified permissions.'}</p>
      <div class="notice">No account can gain classroom messaging access merely by knowing a conversation ID. The backend rechecks role, classroom membership and verified guardian relationships.</div>
      <div class="actions" style="margin-top:16px"><a class="primary" href="/">Return to LittleMindsUniverse</a></div>
    </section></main>`;
  }

  function threadRows(){
    if(!state.threads.length)return '<div class="empty">No Connect conversations yet.</div>';
    return state.threads.map(thread=>{
      const name=counterpart(thread);
      const unread=Number(thread.unread_count||0);
      const active=String(thread.conversation_id)===String(state.activeConversationId);
      return `<button class="connect-thread ${active?'active':''}" data-connect-thread="${esc(thread.conversation_id)}" aria-current="${active?'true':'false'}">
        <span class="connect-avatar">${esc(initials(name))}</span>
        <span class="connect-thread-copy"><b>${esc(name)}</b><p>${esc(thread.learner_name||'Learner')} · ${esc(thread.classroom_name||'Classroom')}</p><small>${esc(short(thread.last_message||'No messages yet'))}</small></span>
        ${unread?`<span class="connect-unread" aria-label="${unread} unread messages">${unread>99?'99+':unread}</span>`:''}
      </button>`;
    }).join('');
  }

  function contactRows(){
    if(!state.contacts.length)return '<div class="empty">No eligible classroom contacts are available.</div>';
    return state.contacts.map(contact=>{
      const name=state.profile.role==='teacher'?contact.guardian_name:contact.teacher_name;
      return `<div class="connect-contact"><div><b>${esc(name||'Contact')}</b><p>${esc(contact.learner_name||'Learner')} · ${esc(contact.classroom_name||'Classroom')}</p></div><button class="tiny" data-connect-contact data-classroom="${esc(contact.classroom_id)}" data-learner="${esc(contact.learner_id)}" data-guardian="${esc(contact.guardian_profile_id||'')}">Open</button></div>`;
    }).join('');
  }

  function messagesHtml(){
    if(state.loading)return '<div class="connect-loading">Loading secure conversation…</div>';
    if(!state.messages.length)return '<div class="connect-empty"><div class="connect-empty-inner"><h2>Start the conversation</h2><p>Messages are visible only to currently authorized participants for this classroom relationship.</p></div></div>';
    return state.messages.map(message=>{
      const mine=!!message.sent_by_me;
      const reply=message.reply_to_message_id?messageById(message.reply_to_message_id):null;
      const readLabel=mine&&message.read_at?' · Read':'';
      return `<div class="connect-message ${mine?'mine':''}"><article class="connect-message-card">
        ${reply?`<span class="connect-reply-chip">Reply to ${esc(reply.sent_by_me?'your message':reply.sender_name||'participant')}: ${esc(short(reply.body))}</span>`:''}
        <div class="connect-message-meta"><b>${esc(mine?'You':message.sender_name||'Participant')}</b><button class="connect-reply-button" data-reply-to="${esc(message.message_id)}">Reply</button></div>
        <p>${esc(message.body)}</p>
        <small>${message.created_at?esc(new Date(message.created_at).toLocaleString()):''}${readLabel}</small>
      </article></div>`;
    }).join('');
  }

  function conversationPane(){
    const active=threadById(state.activeConversationId);
    if(!active)return `<section class="connect-conversation"><div class="connect-empty"><div class="connect-empty-inner"><div class="eyebrow">LittleMinds Connect</div><h2>Choose a conversation</h2><p>Connect uses verified LittleMindsUniverse relationships instead of phone numbers. Open an existing conversation or start one from an eligible classroom contact.</p><div class="notice">Messaging access is independent from premium lesson entitlement.</div></div></div></section>`;
    const name=counterpart(active);
    const replying=state.replyTo?`<div class="connect-replying"><span>Replying to <b>${esc(state.replyTo.sent_by_me?'your message':state.replyTo.sender_name||'participant')}</b>: ${esc(short(state.replyTo.body))}</span><button class="tiny" id="cancelConnectReply">Cancel</button></div>`:'';
    return `<section class="connect-conversation">
      <header class="connect-conversation-head"><div><button class="tiny connect-mobile-back" id="connectBack">← Chats</button><h2>${esc(name)}</h2><p>${esc(active.learner_name||'Learner')} · ${esc(active.classroom_name||'Classroom')}</p></div><button class="ghost" id="connectRefresh">Refresh</button></header>
      <div class="connect-messages" id="connectMessages" aria-live="polite">${messagesHtml()}</div>
      <div class="connect-composer">${replying}<div class="connect-composer-row"><textarea class="textarea" id="connectComposer" maxlength="4000" aria-label="Connect message" placeholder="Write a private class message..."></textarea><button class="primary" id="connectSend" ${state.sending?'disabled':''}>${state.sending?'Sending…':'Send'}</button></div><small class="muted">Every send is authorized again by the server. Maximum 4000 characters.</small></div>
    </section>`;
  }

  function connectView(){
    return `<main class="connect-main">
      <div class="connect-intro"><b>Private by relationship.</b> Connect does not use phone-number discovery. Classroom conversations require an active classroom, active learner membership and a verified guardian relationship with class messaging enabled.</div>
      <div class="connect-shell ${state.activeConversationId?'thread-open':''}">
        <aside class="connect-list"><div class="connect-list-head"><div class="eyebrow">Conversations</div><h1>Messages</h1></div><div class="connect-scroll">${threadRows()}</div><details class="connect-new"><summary>Start or reopen a conversation</summary>${contactRows()}</details></aside>
        ${conversationPane()}
      </div>
    </main>`;
  }

  function render(){
    if(!root)return;
    root.innerHTML=`<div class="connect-page">${topbar()}${!state.session?authView():!authorizedMessagingRole()?roleBlockedView():connectView()}</div>`;
    wire();
  }

  function wire(){
    document.querySelector('#connectAuthForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      signIn(event.currentTarget,document.querySelector('#connectSignIn'));
    });
    document.querySelector('#connectSignOut')?.addEventListener('click',event=>signOut(event.currentTarget));
    document.querySelector('#connectRefresh')?.addEventListener('click',event=>manualRefresh(event.currentTarget));
    document.querySelector('#connectSend')?.addEventListener('click',event=>sendMessage(event.currentTarget));
    document.querySelector('#connectComposer')?.addEventListener('keydown',event=>{
      if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage(document.querySelector('#connectSend'))}
    });
    document.querySelector('#connectBack')?.addEventListener('click',()=>{
      state.activeConversationId=null;state.messages=[];state.replyTo=null;unsubscribeRealtime();render();
    });
    document.querySelector('#cancelConnectReply')?.addEventListener('click',()=>{state.replyTo=null;render();document.querySelector('#connectComposer')?.focus()});
    document.querySelectorAll('[data-connect-thread]').forEach(button=>button.addEventListener('click',()=>openConversation(button.dataset.connectThread)));
    document.querySelectorAll('[data-connect-contact]').forEach(button=>button.addEventListener('click',()=>{
      const contact=state.contacts.find(row=>String(row.classroom_id)===String(button.dataset.classroom)&&String(row.learner_id)===String(button.dataset.learner)&&String(row.guardian_profile_id||'')===String(button.dataset.guardian||''));
      if(contact)startContact(contact,button);
    }));
    document.querySelectorAll('[data-reply-to]').forEach(button=>button.addEventListener('click',()=>{
      state.replyTo=messageById(button.dataset.replyTo);render();document.querySelector('#connectComposer')?.focus();
    }));
  }

  function scrollMessages(){
    requestAnimationFrame(()=>{
      const node=document.querySelector('#connectMessages');
      if(node)node.scrollTop=node.scrollHeight;
    });
  }

  async function init(){
    if(!root)return;
    if(!cfg?.supabaseUrl||!cfg?.supabasePublishableKey||!window.supabase?.createClient){
      root.innerHTML='<div class="connect-role-note"><h1>Connect configuration unavailable</h1><p>The secure client configuration could not be loaded.</p></div>';
      return;
    }
    state.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    try{
      const {data:{session},error}=await state.client.auth.getSession();
      if(error)throw error;
      state.session=session;
      if(session)await loadIdentity();
    }catch(error){
      console.error('Connect initialization failed',error);
      toast('Connect could not initialize. Please try again.');
    }
    render();
    state.client.auth.onAuthStateChange(async(_event,session)=>{
      state.session=session;
      state.profile=null;
      resetMessaging();
      try{if(session)await loadIdentity()}catch(error){console.error('Connect account load failed',error);toast('Your Connect permissions could not be loaded.')}
      render();
    });
    if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('Connect service worker registration failed',error)));
  }

  init();
})();