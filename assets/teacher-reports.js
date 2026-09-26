(function(){
  if(!window.supabase?.createClient)return;

  const previousCreateClient=window.supabase.createClient.bind(window.supabase);
  let client=null;
  window.supabase.createClient=(...args)=>{
    const created=previousCreateClient(...args);
    if(!client)client=created;
    return created;
  };

  const tr={
    profile:null,
    roster:[],
    reports:[],
    selectedClassroomId:null,
    selectedLearnerId:null,
    selectedWeekStart:mondayISO(new Date()),
    activeReportId:null,
    loading:false,
    rendering:false
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function toast(message){
    const node=document.querySelector('#toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),2800);
  }

  function isoLocal(date){
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,'0');
    const d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function mondayISO(value){
    const source=value instanceof Date?value:new Date(`${String(value||'').slice(0,10)}T12:00:00`);
    const date=Number.isNaN(source.getTime())?new Date():new Date(source.getFullYear(),source.getMonth(),source.getDate());
    const offset=(date.getDay()+6)%7;
    date.setDate(date.getDate()-offset);
    return isoLocal(date);
  }

  function reportsVisible(){
    return !!document.querySelector('[data-view="reports"].active');
  }

  function restoreBaseReport(){
    document.querySelector('[data-lmu-base-report-hidden="true"]')?.removeAttribute('hidden');
    document.querySelector('[data-lmu-base-report-hidden="true"]')?.removeAttribute('data-lmu-base-report-hidden');
  }

  function hideBaseReport(){
    const cards=[...document.querySelectorAll('.content > .card')];
    const base=cards.find(card=>card.textContent?.includes('Weekly reports')&&card.textContent?.includes('Teacher-approved progress'));
    if(base){
      base.hidden=true;
      base.dataset.lmuBaseReportHidden='true';
    }
  }

  function reset(){
    tr.profile=null;
    tr.roster=[];
    tr.reports=[];
    tr.selectedClassroomId=null;
    tr.selectedLearnerId=null;
    tr.activeReportId=null;
    document.querySelector('#teacherReportsPanel')?.remove();
    restoreBaseReport();
  }

  async function ensureTeacher(){
    if(!client)return false;
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError||!session){reset();return false}
    if(tr.profile?.id===session.user.id&&tr.profile?.role==='teacher')return true;
    const {data:profile,error}=await client.from('profiles')
      .select('id,role,display_name')
      .eq('id',session.user.id)
      .maybeSingle();
    if(error||!profile||profile.role!=='teacher'){reset();return false}
    tr.profile=profile;
    return true;
  }

  function rosterKey(row){return `${row.classroom_id}|${row.learner_id}`}

  function selectedRoster(){
    return tr.roster.find(row=>String(row.classroom_id)===String(tr.selectedClassroomId)&&String(row.learner_id)===String(tr.selectedLearnerId))||null;
  }

  function activeReport(){
    return tr.reports.find(row=>String(row.report_id)===String(tr.activeReportId))||null;
  }

  async function loadData(preferredReportId=null){
    if(tr.loading)return;
    tr.loading=true;
    try{
      const ok=await ensureTeacher();
      if(!ok)return;
      const [{data:roster,error:rosterError},{data:reports,error:reportsError}]=await Promise.all([
        client.rpc('get_teacher_report_roster'),
        client.rpc('get_teacher_weekly_reports')
      ]);
      if(rosterError)throw rosterError;
      if(reportsError)throw reportsError;
      tr.roster=roster||[];
      tr.reports=reports||[];

      if(!selectedRoster()){
        const first=tr.roster[0]||null;
        tr.selectedClassroomId=first?.classroom_id||null;
        tr.selectedLearnerId=first?.learner_id||null;
      }

      const preferred=preferredReportId&&tr.reports.find(row=>String(row.report_id)===String(preferredReportId));
      if(preferred){
        tr.activeReportId=preferred.report_id;
        tr.selectedClassroomId=preferred.classroom_id;
        tr.selectedLearnerId=preferred.learner_id;
        tr.selectedWeekStart=preferred.week_start;
      }else if(!activeReport()){
        const match=tr.reports.find(row=>String(row.classroom_id)===String(tr.selectedClassroomId)&&String(row.learner_id)===String(tr.selectedLearnerId));
        tr.activeReportId=match?.report_id||null;
      }
    }catch(error){
      console.error('Teacher reports load failed',error);
      toast('Teacher reports could not be loaded. Please try again.');
    }finally{
      tr.loading=false;
    }
  }

  function reportStatusTag(status){return status==='approved'?'ok':'warn'}

  function editorHtml(report){
    if(!report)return `<div class="empty">Create or choose a weekly report to begin.</div>`;
    if(report.status==='approved')return `<div class="notice ok"><b>Approved and released</b><br>This report is visible only to authorized guardians who are permitted to receive reports. Approved reports are read-only here.</div><div class="task"><div><h3>Week of ${esc(report.week_start)}</h3><p><b>Summary:</b> ${esc(report.summary)}</p><p><b>Strengths:</b> ${esc(report.strengths)}</p><p><b>Next steps:</b> ${esc(report.next_steps)}</p><p><b>Home support:</b> ${esc(report.home_support)}</p></div></div>`;
    return `<div class="notice"><b>Teacher approval is required.</b> The draft may be generated from reviewed mastery evidence, but the teacher must edit and approve it before a guardian can receive it.</div><div class="field"><label for="teacherReportSummary">Summary</label><textarea id="teacherReportSummary" class="textarea" maxlength="4000">${esc(report.summary||'')}</textarea></div><div class="field"><label for="teacherReportStrengths">Strengths</label><textarea id="teacherReportStrengths" class="textarea" maxlength="4000">${esc(report.strengths||'')}</textarea></div><div class="field"><label for="teacherReportNextSteps">Next steps</label><textarea id="teacherReportNextSteps" class="textarea" maxlength="4000">${esc(report.next_steps||'')}</textarea></div><div class="field"><label for="teacherReportHomeSupport">Home support</label><textarea id="teacherReportHomeSupport" class="textarea" maxlength="4000">${esc(report.home_support||'')}</textarea></div><div class="actions"><button class="ghost" id="saveTeacherReport">Save draft</button><button class="primary" id="approveTeacherReport">Approve & release to guardian</button></div><p class="muted">Approval is the release point. WhatsApp delivery, when enabled later, is a separate provider workflow and is not triggered by this screen.</p>`;
  }

  function recentReportsHtml(){
    if(!tr.reports.length)return '<div class="empty">No weekly reports have been created yet.</div>';
    return tr.reports.slice(0,20).map(report=>`<button class="task ghost" style="width:100%;text-align:left" data-teacher-report="${esc(report.report_id)}"><div><span class="tag ${reportStatusTag(report.status)}">${esc(report.status)}</span><b>${esc(report.learner_name||'Learner')}</b><p>${esc(report.classroom_name||'Classroom')} · week of ${esc(report.week_start)}</p><small class="muted">${report.status==='approved'?'Released to authorized guardian view':'Teacher draft'}</small></div></button>`).join('');
  }

  function renderPanel(){
    if(tr.rendering||!reportsVisible()||tr.profile?.role!=='teacher')return;
    const content=document.querySelector('.content');
    if(!content)return;
    tr.rendering=true;
    try{
      hideBaseReport();
      document.querySelector('#teacherReportsPanel')?.remove();
      const selected=selectedRoster();
      const report=activeReport();
      const section=document.createElement('section');
      section.id='teacherReportsPanel';
      section.innerHTML=`<div class="grid two"><div class="card"><div class="eyebrow">Teacher weekly workflow</div><h2>Create or refresh report</h2>${tr.roster.length?`<div class="field"><label for="teacherReportLearner">Learner & classroom</label><select id="teacherReportLearner" class="select">${tr.roster.map(row=>`<option value="${esc(rosterKey(row))}" ${String(row.classroom_id)===String(tr.selectedClassroomId)&&String(row.learner_id)===String(tr.selectedLearnerId)?'selected':''}>${esc(row.learner_name||'Learner')} · ${esc(row.classroom_name||'Classroom')}</option>`).join('')}</select></div><div class="field"><label for="teacherReportWeek">Week starting Monday</label><input id="teacherReportWeek" class="input" type="date" value="${esc(tr.selectedWeekStart)}"></div><button class="primary" id="generateTeacherReport">Generate / refresh draft</button><p class="muted">Generation uses reviewed mastery evidence. Existing approved reports are not overwritten.</p>`:'<div class="empty">No active classroom learners are available for reporting.</div>'}</div><div class="card"><div class="eyebrow">Recent reports</div><h2>Drafts & approved reports</h2>${recentReportsHtml()}</div></div><div class="card" style="margin-top:14px"><div class="eyebrow">Teacher review</div><h2>${report?`${esc(report.learner_name||selected?.learner_name||'Learner')} · week of ${esc(report.week_start)}`:'Report editor'}</h2>${editorHtml(report)}</div>`;
      const footer=content.querySelector('.footer');
      content.insertBefore(section,footer||null);
      wirePanel(section);
    }finally{
      tr.rendering=false;
    }
  }

  function wirePanel(section){
    section.querySelector('#teacherReportLearner')?.addEventListener('change',event=>{
      const [classroomId,learnerId]=String(event.target.value||'').split('|');
      const row=tr.roster.find(item=>String(item.classroom_id)===classroomId&&String(item.learner_id)===learnerId);
      if(!row)return;
      tr.selectedClassroomId=row.classroom_id;
      tr.selectedLearnerId=row.learner_id;
      const existing=tr.reports.find(report=>String(report.classroom_id)===String(row.classroom_id)&&String(report.learner_id)===String(row.learner_id));
      tr.activeReportId=existing?.report_id||null;
      renderPanel();
    });

    section.querySelector('#teacherReportWeek')?.addEventListener('change',event=>{
      const normalized=mondayISO(event.target.value);
      tr.selectedWeekStart=normalized;
      if(event.target.value!==normalized)toast('Weekly reports start on Monday; the date was adjusted.');
      event.target.value=normalized;
    });

    section.querySelector('#generateTeacherReport')?.addEventListener('click',event=>generateReport(event.currentTarget));
    section.querySelector('#saveTeacherReport')?.addEventListener('click',event=>saveDraft(event.currentTarget));
    section.querySelector('#approveTeacherReport')?.addEventListener('click',event=>approveReport(event.currentTarget));
    section.querySelectorAll('[data-teacher-report]').forEach(button=>button.addEventListener('click',()=>{
      const report=tr.reports.find(row=>String(row.report_id)===String(button.dataset.teacherReport));
      if(!report)return;
      tr.activeReportId=report.report_id;
      tr.selectedClassroomId=report.classroom_id;
      tr.selectedLearnerId=report.learner_id;
      tr.selectedWeekStart=report.week_start;
      renderPanel();
    }));
  }

  function draftValues(){
    return {
      summary:document.querySelector('#teacherReportSummary')?.value.trim()||'',
      strengths:document.querySelector('#teacherReportStrengths')?.value.trim()||'',
      nextSteps:document.querySelector('#teacherReportNextSteps')?.value.trim()||'',
      homeSupport:document.querySelector('#teacherReportHomeSupport')?.value.trim()||''
    };
  }

  async function generateReport(button){
    if(button.disabled||!client||!selectedRoster())return;
    const week=mondayISO(document.querySelector('#teacherReportWeek')?.value||tr.selectedWeekStart);
    tr.selectedWeekStart=week;
    button.disabled=true;button.textContent='Generating…';
    try{
      const {data,error}=await client.rpc('create_or_refresh_weekly_report',{
        p_classroom_id:tr.selectedClassroomId,
        p_learner_id:tr.selectedLearnerId,
        p_week_start:week
      });
      if(error)throw error;
      await loadData(data||null);
      renderPanel();
      toast('Weekly report draft is ready for teacher review.');
    }catch(error){
      console.error('Teacher report generation failed',error);
      toast('The report draft could not be generated.');
    }finally{
      if(button.isConnected){button.disabled=false;button.textContent='Generate / refresh draft'}
    }
  }

  async function persistDraft(reportId,values){
    const {error}=await client.rpc('update_teacher_weekly_report',{
      p_report_id:reportId,
      p_summary:values.summary,
      p_strengths:values.strengths,
      p_next_steps:values.nextSteps,
      p_home_support:values.homeSupport
    });
    if(error)throw error;
  }

  async function saveDraft(button){
    const report=activeReport();
    if(button.disabled||!client||!report||report.status!=='draft')return;
    button.disabled=true;button.textContent='Saving…';
    try{
      await persistDraft(report.report_id,draftValues());
      await loadData(report.report_id);
      renderPanel();
      toast('Weekly report draft saved.');
    }catch(error){
      console.error('Teacher report save failed',error);
      toast('The report draft could not be saved.');
    }finally{
      if(button.isConnected){button.disabled=false;button.textContent='Save draft'}
    }
  }

  async function approveReport(button){
    const report=activeReport();
    if(button.disabled||!client||!report||report.status!=='draft')return;
    const values=draftValues();
    if(!values.summary||!values.strengths||!values.nextSteps||!values.homeSupport)return toast('Complete all four report sections before approval.');
    if(!window.confirm('Approve this weekly report and release it to authorized guardians? Approved reports become read-only.'))return;
    button.disabled=true;button.textContent='Approving…';
    try{
      await persistDraft(report.report_id,values);
      const {error}=await client.rpc('approve_teacher_weekly_report',{p_report_id:report.report_id});
      if(error)throw error;
      await loadData(report.report_id);
      renderPanel();
      toast('Weekly report approved and released to authorized guardians.');
    }catch(error){
      console.error('Teacher report approval failed',error);
      toast('The report could not be approved. It remains a draft.');
    }finally{
      if(button.isConnected){button.disabled=false;button.textContent='Approve & release to guardian'}
    }
  }

  let scheduled=false;
  async function maybeMount(){
    if(!reportsVisible()){
      document.querySelector('#teacherReportsPanel')?.remove();
      restoreBaseReport();
      return;
    }
    const ok=await ensureTeacher();
    if(!ok)return;
    if(!tr.roster.length&&!tr.reports.length)await loadData();
    if(!document.querySelector('#teacherReportsPanel'))renderPanel();
  }

  function scheduleMount(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(async()=>{
      scheduled=false;
      try{await maybeMount()}catch(error){console.error('Teacher report mount failed',error)}
    },0);
  }

  new MutationObserver(scheduleMount).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',scheduleMount);
  scheduleMount();
})();
