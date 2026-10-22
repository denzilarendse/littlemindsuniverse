(function(){
  if(!window.supabase?.createClient)return;
  const createClient=window.supabase.createClient.bind(window.supabase);
  let client=null;
  window.supabase.createClient=(...args)=>{const c=createClient(...args);if(!client)client=c;return c;};
  const s={profile:null,roster:[],groups:[],parentClassroomId:'',loading:false,busy:false};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=m=>{const n=document.querySelector('#toast');if(!n)return;n.textContent=m;n.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove('show'),3000);};
  function visible(){return !!document.querySelector('[data-view="classroom"].active');}
  function reset(){s.profile=null;s.roster=[];s.groups=[];s.parentClassroomId='';document.querySelector('#supportGroupsPanel')?.remove();}
  async function ensureTeacher(){
    if(!client)return false;
    const {data:{session},error}=await client.auth.getSession();
    if(error||!session){reset();return false;}
    const {data:p,error:e}=await client.from('profiles').select('id,role').eq('id',session.user.id).maybeSingle();
    if(e||!p||p.role!=='teacher'){reset();return false;}
    s.profile=p;return true;
  }
  async function load(){
    if(s.loading||s.busy||!visible())return;
    s.loading=true;
    try{
      if(!await ensureTeacher())return;
      const {data,error}=await client.rpc('get_teacher_report_roster');
      if(error)throw error;
      s.roster=data||[];
      const classrooms=[...new Map(s.roster.map(r=>[String(r.classroom_id),{id:r.classroom_id,name:r.classroom_name}])).values()];
      if(!classrooms.some(c=>String(c.id)===String(s.parentClassroomId)))s.parentClassroomId=classrooms[0]?.id||'';
      if(s.parentClassroomId){
        const result=await client.rpc('get_teacher_support_groups',{p_parent_classroom_id:s.parentClassroomId});
        if(result.error)throw result.error;
        s.groups=result.data||[];
      }else s.groups=[];
    }catch(e){console.error('Support groups load failed',e);toast('Support groups could not be loaded. Please retry.');}
    finally{s.loading=false;render();}
  }
  function render(){
    if(!visible()||s.profile?.role!=='teacher')return;
    const content=document.querySelector('.content');if(!content)return;
    document.querySelector('#supportGroupsPanel')?.remove();
    const classrooms=[...new Map(s.roster.map(r=>[String(r.classroom_id),{id:r.classroom_id,name:r.classroom_name}])).values()];
    const section=document.createElement('section');section.id='supportGroupsPanel';
    const groups=s.groups.map(g=>{
      const ids=Array.isArray(g.learner_ids)?g.learner_ids:[];
      const learners=s.roster.filter(r=>String(r.classroom_id)===String(s.parentClassroomId));
      const chosen=new Set(ids.map(String));
      const label=g.group_type==='intervention'?'Intervention':'Enrichment';
      return '<article class="card" style="margin-top:12px"><div class="eyebrow">'+label+'</div><h3>'+esc(g.group_name)+'</h3><p>'+esc(g.skill_name||'Target skill not specified')+'</p><p class="muted">Created '+esc(String(g.created_at||'').slice(0,10))+' · '+ids.length+' learner(s)</p><div class="field"><label for="support-members-'+esc(g.group_classroom_id)+'">Group learners</label><select multiple size="'+Math.max(2,Math.min(6,learners.length))+'" class="select" data-support-members="'+esc(g.group_classroom_id)+'">'+learners.map(r=>'<option value="'+esc(r.learner_id)+'" '+(chosen.has(String(r.learner_id))?'selected':'')+'>'+esc(r.learner_name)+'</option>').join('')+'</select><small class="muted">Only active learners in this parent classroom are listed. Choose 1–50 learners.</small></div><div class="actions"><button class="primary" data-support-save="'+esc(g.group_classroom_id)+'">Save group membership</button><button class="ghost" data-support-close="'+esc(g.group_classroom_id)+'">Dissolve group</button></div></article>';
    }).join('');
    section.innerHTML='<div class="card"><div class="eyebrow">Teacher tools</div><h2>Intervention & enrichment groups</h2><p>Manage temporary support groups for targeted practice. Changes are checked by the server against your classroom ownership and active roster.</p><div class="field"><label for="supportParentClassroom">Parent classroom</label><select id="supportParentClassroom" class="select">'+classrooms.map(c=>'<option value="'+esc(c.id)+'" '+(String(c.id)===String(s.parentClassroomId)?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></div>'+(s.loading?'<p>Loading groups…</p>':groups||'<div class="empty">No active intervention or enrichment groups for this classroom yet. Approve an eligible Milo recommendation to create a group.</div>')+'<p class="muted">Dissolving a group closes it; it does not delete learning evidence. WhatsApp is not used; communication remains within LittleMinds Connect.</p></div>';
    const footer=content.querySelector('.footer');content.insertBefore(section,footer||null);
    section.querySelector('#supportParentClassroom')?.addEventListener('change',async e=>{s.parentClassroomId=e.target.value;await load();});
    section.querySelectorAll('[data-support-save]').forEach(btn=>btn.addEventListener('click',async()=>{
      if(s.busy)return;
      const groupId=btn.dataset.supportSave;const select=section.querySelector('[data-support-members="'+CSS.escape(groupId)+'"]');
      const ids=[...select.selectedOptions].map(o=>o.value);
      if(!ids.length||ids.length>50){toast('Choose between 1 and 50 learners.');return;}
      s.busy=true;btn.disabled=true;
      try{const {data,error}=await client.rpc('set_support_group_members',{p_group_classroom_id:groupId,p_learner_ids:ids});if(error)throw error;toast('Group membership saved ('+Number(data)+' learners).');}
      catch(e){console.error('Support group update failed',e);toast('Could not save group membership. Check the selected learners and try again.');}
      finally{s.busy=false;await load();}
    }));
    section.querySelectorAll('[data-support-close]').forEach(btn=>btn.addEventListener('click',async()=>{
      if(s.busy)return;
      if(!window.confirm('Dissolve this support group? The group closes; learning evidence is retained.'))return;
      s.busy=true;btn.disabled=true;
      try{const {data,error}=await client.rpc('close_support_group',{p_classroom_id:btn.dataset.supportClose});if(error)throw error;if(data!==true)throw new Error('Close operation was not confirmed.');toast('Support group dissolved.');}
      catch(e){console.error('Support group close failed',e);toast('Could not dissolve this group. Please retry.');}
      finally{s.busy=false;await load();}
    }));
  }
  function tick(){if(visible()){if(!s.profile)load();else if(!document.querySelector('#supportGroupsPanel'))render();}else document.querySelector('#supportGroupsPanel')?.remove();}
  window.addEventListener('lmu:auth-changed',()=>{reset();tick();});
  const observer=new MutationObserver(()=>{if(visible())tick();else document.querySelector('#supportGroupsPanel')?.remove();});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('online',tick);
  // Re-check the database role periodically so a revoked teacher role does not leave learner data visible in a stale panel.
  setInterval(()=>{if(visible())load();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible())load();});
  setTimeout(tick,0);
})();