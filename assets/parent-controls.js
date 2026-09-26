(function(){
  if(!window.supabase?.createClient)return;

  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  let client=null;
  window.supabase.createClient=(...args)=>{
    const created=originalCreateClient(...args);
    if(!client)client=created;
    return created;
  };

  const pc={
    session:null,
    profile:null,
    permissions:[],
    notificationPreferences:[],
    selectedLearnerId:null,
    device:null,
    receipts:[],
    loading:false,
    loadedFor:null,
    rendering:false
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'
  }[char]));

  const toast=message=>{
    const node=document.querySelector('#toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),2600);
  };

  function reset(){
    pc.session=null;
    pc.profile=null;
    pc.permissions=[];
    pc.notificationPreferences=[];
    pc.selectedLearnerId=null;
    pc.device=null;
    pc.receipts=[];
    pc.loadedFor=null;
    document.querySelector('#parentAuthorizationPanel')?.remove();
  }

  function settingsIsVisible(){
    return !!document.querySelector('[data-view="settings"].active');
  }

  function learnerRows(){
    const byId=new Map();
    for(const row of pc.permissions||[]){
      if(row?.learner_id&&!byId.has(String(row.learner_id)))byId.set(String(row.learner_id),{
        id:row.learner_id,
        name:row.learner_name||'Learner'
      });
    }
    for(const row of pc.notificationPreferences||[]){
      if(row?.learner_id&&!byId.has(String(row.learner_id)))byId.set(String(row.learner_id),{
        id:row.learner_id,
        name:row.learner_name||'Learner'
      });
    }
    return [...byId.values()];
  }

  async function ensureParent(){
    if(!client)return false;
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError||!session){reset();return false}
    pc.session=session;
    if(pc.profile?.id===session.user.id&&pc.profile?.role==='parent')return true;
    const {data:profile,error}=await client.from('profiles')
      .select('id,role,display_name')
      .eq('id',session.user.id)
      .maybeSingle();
    if(error||!profile||profile.role!=='parent'){reset();return false}
    pc.profile=profile;
    return true;
  }

  async function loadBase(){
    if(pc.loading)return;
    pc.loading=true;
    try{
      const ok=await ensureParent();
      if(!ok)return;
      const [{data:permissions,error:permissionError},{data:prefs,error:prefsError}]=await Promise.all([
        client.rpc('get_guardian_evidence_permissions'),
        client.rpc('get_parent_notification_preferences')
      ]);
      if(permissionError)throw permissionError;
      if(prefsError)throw prefsError;
      pc.permissions=permissions||[];
      pc.notificationPreferences=prefs||[];
      const learners=learnerRows();
      if(!learners.some(row=>String(row.id)===String(pc.selectedLearnerId))){
        pc.selectedLearnerId=learners[0]?.id||null;
      }
      await loadSelected();
    }catch(error){
      console.error('Parent controls load failed',error);
      toast('Parent controls could not be loaded. Please try again.');
    }finally{
      pc.loading=false;
    }
  }

  async function loadSelected(){
    if(!client||!pc.selectedLearnerId)return;
    const learnerId=pc.selectedLearnerId;
    const [{data:device,error:deviceError},{data:receipts,error:receiptError}]=await Promise.all([
      client.rpc('get_learner_device_feature_status',{p_learner_id:learnerId}),
      client.from('guardian_consent_receipts')
        .select('id,learner_id,consent_type,action,policy_title_snapshot,policy_version_snapshot,child_facing_label_snapshot,occurred_at')
        .eq('learner_id',learnerId)
        .order('occurred_at',{ascending:false})
        .limit(12)
    ]);
    if(deviceError)throw deviceError;
    if(receiptError)throw receiptError;
    pc.device=Array.isArray(device)?device[0]||null:device||null;
    pc.receipts=receipts||[];
    pc.loadedFor=String(learnerId);
  }

  function selectedPermissions(){
    return (pc.permissions||[]).filter(row=>String(row.learner_id)===String(pc.selectedLearnerId));
  }

  function selectedPreference(){
    return (pc.notificationPreferences||[]).find(row=>String(row.learner_id)===String(pc.selectedLearnerId))||null;
  }

  function currentIdentity(){
    const row=selectedPermissions()[0];
    return {
      relationship:row?.relationship||'parent',
      label:row?.child_facing_label||pc.device?.evidence_approver_label||'Guardian'
    };
  }

  const relationshipOptions=[
    ['mother','Mother'],['father','Father'],['parent','Parent'],
    ['grandmother','Grandmother'],['grandfather','Grandfather'],['aunt','Aunt'],['uncle','Uncle'],
    ['foster_parent','Foster parent'],['legal_guardian','Legal guardian'],['guardian','Guardian'],['other_guardian','Other guardian']
  ];

  function permissionLabel(key){
    return {
      camera_evidence:'Camera evidence',
      video_evidence:'Video evidence',
      audio_evidence:'Audio / reading evidence',
      speech_transcription:'Speech-to-text transcription'
    }[key]||key;
  }

  function evidenceHtml(){
    const rows=selectedPermissions();
    if(!rows.length)return '<div class="empty">No evidence policies are available for this learner.</div>';
    return rows.map(row=>{
      const granted=row.consent_status==='granted';
      const canChange=!!row.primary_guardian&&!!row.can_approve_evidence;
      const pending=row.pending_retention_days==null?'policy-defined':`${Number(row.pending_retention_days)} day${Number(row.pending_retention_days)===1?'':'s'}`;
      const approved=Number(row.approved_raw_retention_days||0)===0?'no retained raw media':`${Number(row.approved_raw_retention_days)} day${Number(row.approved_raw_retention_days)===1?'':'s'}`;
      return `<div class="task"><div><span class="tag ${granted?'ok':'warn'}">${granted?'Enabled':'Not enabled'}</span><h3>${esc(permissionLabel(row.policy_key))}</h3><p>${esc(row.policy_title||'Evidence consent policy')} · version ${esc(row.policy_version||'—')}</p><small class="muted">Pending media: ${esc(pending)} · approved raw media: ${esc(approved)}${row.max_capture_seconds?` · capture limit ${esc(row.max_capture_seconds)} seconds`:''}</small><details style="margin-top:8px"><summary>Read policy</summary><p>${esc(row.policy_body||'Policy text is unavailable.')}</p></details></div>${canChange?`<button class="${granted?'ghost':'primary'}" data-parent-consent="${esc(row.policy_key)}" data-policy-version-id="${esc(row.policy_version_id)}" data-grant="${granted?'false':'true'}">${granted?'Revoke permission':'Agree & enable'}</button>`:'<span class="tag">Primary caregiver approval required</span>'}</div>`;
    }).join('');
  }

  function receiptsHtml(){
    if(!pc.receipts.length)return '<div class="empty">No consent changes recorded yet.</div>';
    return pc.receipts.map(row=>`<div class="task"><div><span class="tag ${row.action==='granted'?'ok':'warn'}">${esc(row.action)}</span><b>${esc(permissionLabel(row.consent_type))}</b><p>${esc(row.policy_title_snapshot||'Consent policy')} · version ${esc(row.policy_version_snapshot||'—')}</p><small class="muted">${row.occurred_at?esc(new Date(row.occurred_at).toLocaleString()):''}${row.child_facing_label_snapshot?` · caregiver label ${esc(row.child_facing_label_snapshot)}`:''}</small></div></div>`).join('');
  }

  function renderPanel(){
    if(pc.rendering||!settingsIsVisible()||pc.profile?.role!=='parent')return;
    const content=document.querySelector('.content');
    if(!content)return;
    document.querySelector('#parentAuthorizationPanel')?.remove();
    const learners=learnerRows();
    if(!learners.length)return;
    const identity=currentIdentity();
    const pref=selectedPreference()||{};
    const device=pc.device||{};
    const section=document.createElement('section');
    section.id='parentAuthorizationPanel';
    section.innerHTML=`<h2 class="section-title">Parent authorization & controls</h2><div class="notice"><b>Two separate permissions apply.</b> LittleMindsUniverse records the parent/guardian decision below. Your phone or browser must still separately grant camera or microphone hardware access when a feature is actually used. LMU never treats database consent as device permission.</div><div class="card" style="margin-top:14px"><div class="field"><label for="parentControlLearner">Manage learner</label><select id="parentControlLearner" class="select">${learners.map(row=>`<option value="${esc(row.id)}" ${String(row.id)===String(pc.selectedLearnerId)?'selected':''}>${esc(row.name)}</option>`).join('')}</select></div></div><div class="grid two" style="margin-top:14px"><div class="card"><div class="eyebrow">Caregiver identity</div><h2>How this learner sees you</h2><div class="field"><label for="parentRelationship">Relationship</label><select id="parentRelationship" class="select">${relationshipOptions.map(([value,label])=>`<option value="${value}" ${value===identity.relationship?'selected':''}>${label}</option>`).join('')}</select></div><div class="field"><label for="parentChildLabel">Child-facing name</label><input id="parentChildLabel" class="input" maxlength="40" value="${esc(identity.label)}" placeholder="e.g. Mom, Dad, Gran"></div><button class="primary" id="saveParentIdentity">Save caregiver identity</button></div><div class="card"><div class="eyebrow">Audio experience</div><h2>Playback controls</h2><label class="task"><div><b>Milo read aloud</b><p>Allow Milo responses to be spoken aloud on this learner's device.</p></div><input type="checkbox" id="parentMiloReadAloud" ${device.milo_read_aloud_enabled?'checked':''}></label><label class="task"><div><b>Audio playback</b><p>Allow approved learning audio to play for this learner.</p></div><input type="checkbox" id="parentAudioPlayback" ${device.audio_playback_enabled?'checked':''}></label><button class="primary" id="saveParentAudioControls">Save audio controls</button></div></div><div class="card" style="margin-top:14px"><div class="eyebrow">Evidence privacy</div><h2>Camera, video, audio & transcription consent</h2><p class="muted">Consent is policy-versioned and auditable. Revoking a feature stops future permission; retention and deletion follow the applicable policy and approved LittleMindsUniverse retention rules.</p>${evidenceHtml()}</div><div class="grid two" style="margin-top:14px"><div class="card"><div class="eyebrow">Notifications</div><h2>For ${esc(pref.learner_name||learners.find(row=>String(row.id)===String(pc.selectedLearnerId))?.name||'this learner')}</h2><label class="task"><span>Weekly reports</span><input type="checkbox" id="prefReports" ${pref.can_receive_reports?'checked':''}></label><label class="task"><span>Evidence approval requests</span><input type="checkbox" id="prefEvidence" ${pref.can_receive_evidence_requests?'checked':''}></label><label class="task"><span>LittleMinds Connect class messages</span><input type="checkbox" id="prefClassMessages" ${pref.can_receive_class_messages?'checked':''}></label><button class="primary" id="saveParentNotifications">Save notification preferences</button></div><div class="card"><div class="eyebrow">LittleMinds Connect</div><h2>Private family-school messaging</h2><p class="muted">Connect keeps teacher and guardian communication inside LittleMindsUniverse. Private phone numbers are not shared. Conversation access is rechecked against the verified guardian relationship and active classroom membership.</p><div class="notice ok">Messaging access remains available independently from premium lesson entitlement wherever the verified relationship is active.</div><button class="primary" id="openConnectMessaging">Open Connect messages</button></div></div><div class="card" style="margin-top:14px"><div class="eyebrow">Audit trail</div><h2>Consent history</h2>${receiptsHtml()}</div>`;
    const footer=content.querySelector('.footer');
    content.insertBefore(section,footer||null);
    wirePanel(section);
  }

  function wirePanel(section){
    section.querySelector('#parentControlLearner')?.addEventListener('change',async event=>{
      pc.selectedLearnerId=event.target.value;
      try{await loadSelected();renderPanel()}catch(error){console.error('Parent learner control switch failed',error);toast('Learner controls could not be loaded.')}
    });

    section.querySelector('#saveParentIdentity')?.addEventListener('click',event=>saveIdentity(event.currentTarget));
    section.querySelector('#saveParentAudioControls')?.addEventListener('click',event=>saveAudioControls(event.currentTarget));
    section.querySelector('#saveParentNotifications')?.addEventListener('click',event=>saveNotifications(event.currentTarget));
    section.querySelector('#openConnectMessaging')?.addEventListener('click',()=>document.querySelector('[data-view="messages"]')?.click());
    section.querySelectorAll('[data-parent-consent]').forEach(button=>button.addEventListener('click',()=>setConsent(button)));
  }

  function canMutate(){
    return !!client&&pc.session?.user?.id&&pc.profile?.role==='parent'&&!!pc.selectedLearnerId;
  }

  async function refreshAfterMutation(message){
    pc.loadedFor=null;
    await loadBase();
    renderPanel();
    toast(message);
  }

  async function saveIdentity(button){
    if(!canMutate()||button.disabled)return;
    const relationship=document.querySelector('#parentRelationship')?.value||'parent';
    const label=document.querySelector('#parentChildLabel')?.value.trim()||'';
    if(label.length<1||label.length>40)return toast('Use a caregiver label between 1 and 40 characters.');
    button.disabled=true;button.textContent='Saving…';
    try{
      const {error}=await client.rpc('set_guardian_child_facing_identity',{
        p_learner_id:pc.selectedLearnerId,
        p_relationship:relationship,
        p_child_facing_label:label
      });
      if(error)throw error;
      await refreshAfterMutation('Caregiver identity updated.');
    }catch(error){console.error('Caregiver identity update failed',error);toast('Caregiver identity could not be updated.')}finally{if(button.isConnected){button.disabled=false;button.textContent='Save caregiver identity'}}
  }

  async function saveAudioControls(button){
    if(!canMutate()||button.disabled)return;
    const readAloud=!!document.querySelector('#parentMiloReadAloud')?.checked;
    const playback=!!document.querySelector('#parentAudioPlayback')?.checked;
    button.disabled=true;button.textContent='Saving…';
    try{
      const first=await client.rpc('set_guardian_feature_control',{p_learner_id:pc.selectedLearnerId,p_feature_key:'milo_read_aloud',p_enabled:readAloud});
      if(first.error)throw first.error;
      const second=await client.rpc('set_guardian_feature_control',{p_learner_id:pc.selectedLearnerId,p_feature_key:'audio_playback',p_enabled:playback});
      if(second.error)throw second.error;
      await refreshAfterMutation('Audio controls updated.');
    }catch(error){console.error('Audio controls update failed',error);toast('Audio controls could not be updated.')}finally{if(button.isConnected){button.disabled=false;button.textContent='Save audio controls'}}
  }

  async function setConsent(button){
    if(!canMutate()||button.disabled)return;
    const key=button.dataset.parentConsent;
    const policyVersionId=button.dataset.policyVersionId;
    const grant=button.dataset.grant==='true';
    if(grant&&!confirm('I have read this policy and agree to enable this feature for this learner.'))return;
    button.disabled=true;button.textContent=grant?'Enabling…':'Revoking…';
    try{
      const {error}=await client.rpc('set_guardian_evidence_consent',{
        p_learner_id:pc.selectedLearnerId,
        p_consent_type:key,
        p_policy_version_id:policyVersionId,
        p_grant:grant
      });
      if(error)throw error;
      await refreshAfterMutation(grant?'Permission enabled.':'Permission revoked.');
    }catch(error){console.error('Evidence consent update failed',error);toast('Evidence permission could not be updated.')}finally{if(button.isConnected){button.disabled=false;button.textContent=grant?'Agree & enable':'Revoke permission'}}
  }

  async function saveNotifications(button){
    if(!canMutate()||button.disabled)return;
    button.disabled=true;button.textContent='Saving…';
    try{
      const {error}=await client.rpc('set_parent_notification_preferences',{
        p_learner_id:pc.selectedLearnerId,
        p_can_receive_reports:!!document.querySelector('#prefReports')?.checked,
        p_can_receive_whatsapp:false,
        p_can_receive_evidence_requests:!!document.querySelector('#prefEvidence')?.checked,
        p_can_receive_class_messages:!!document.querySelector('#prefClassMessages')?.checked
      });
      if(error)throw error;
      await refreshAfterMutation('Notification preferences updated.');
    }catch(error){console.error('Notification preference update failed',error);toast('Notification preferences could not be updated.')}finally{if(button.isConnected){button.disabled=false;button.textContent='Save notification preferences'}}
  }

  async function maybeMount(){
    if(pc.rendering||!settingsIsVisible()||!client)return;
    pc.rendering=true;
    try{
      const ok=await ensureParent();
      if(!ok)return;
      if(pc.loadedFor!==String(pc.selectedLearnerId||'')||!pc.permissions.length){
        await loadBase();
      }
      if(settingsIsVisible())renderPanel();
    }finally{
      pc.rendering=false;
    }
  }

  const app=document.querySelector('#app');
  if(app){
    let timer=null;
    const observer=new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>maybeMount().catch(error=>console.error('Parent controls mount failed',error)),40);
    });
    observer.observe(app,{childList:true,subtree:true});
  }
})();