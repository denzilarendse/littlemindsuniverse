(function(){
  const cfg=window.LMU_CONFIG||{};
  const toastNode=document.querySelector('#toast');
  const authForm=document.querySelector('#privacyAuthForm');
  const authStatus=document.querySelector('#authStatus');
  const signedInActions=document.querySelector('#signedInActions');
  const removalCard=document.querySelector('#accountRemovalCard');
  const inquiryCard=document.querySelector('#inquiryCard');
  const removalIdentity=document.querySelector('#removalIdentity');
  const confirmRemoval=document.querySelector('#confirmAccountRemoval');
  const submitRemoval=document.querySelector('#submitAccountRemoval');
  const removalResult=document.querySelector('#accountRemovalResult');
  const inquiryResult=document.querySelector('#inquiryResult');
  let client=null;
  let session=null;

  function toast(message){
    if(!toastNode)return;
    toastNode.textContent=String(message||'');
    toastNode.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>toastNode.classList.remove('show'),2800);
  }

  function setResult(node,message,ok=true){
    if(!node)return;
    node.hidden=false;
    node.classList.toggle('ok',!!ok);
    node.classList.toggle('warn',!ok);
    node.textContent=message;
  }

  function render(){
    const signed=!!session?.user?.id;
    authForm.hidden=signed;
    signedInActions.hidden=!signed;
    removalCard.hidden=!signed;
    inquiryCard.hidden=!signed;
    authStatus.textContent=signed
      ? `Verified LittleMindsUniverse session: ${session.user.email||'account'}`
      : 'Use the LittleMindsUniverse account for which you want to submit a privacy request.';
    if(removalIdentity)removalIdentity.textContent=signed
      ? `Request will apply to ${session.user.email||'this verified account'}.`
      : '';
    if(!signed){
      if(confirmRemoval)confirmRemoval.checked=false;
      if(submitRemoval)submitRemoval.disabled=true;
    }
    if(signed&&new URLSearchParams(location.search).get('mode')==='inquiry'){
      setTimeout(()=>inquiryCard?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }
  }

  async function signIn(event){
    event.preventDefault();
    const email=document.querySelector('#privacyEmail')?.value.trim()||'';
    const password=document.querySelector('#privacyPassword')?.value||'';
    const button=document.querySelector('#privacySignIn');
    if(!email||!password)return toast('Enter your email and password.');
    button.disabled=true;button.textContent='Signing in…';
    try{
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
    }catch(error){
      console.error('Privacy request sign-in failed',error);
      toast(error?.message||'Sign in failed.');
    }finally{
      if(button.isConnected){button.disabled=false;button.textContent='Sign in'}
    }
  }

  async function resetPassword(){
    const email=document.querySelector('#privacyEmail')?.value.trim()||'';
    const button=document.querySelector('#privacyResetPassword');
    if(!email)return toast('Enter your email first.');
    button.disabled=true;button.textContent='Sending…';
    try{
      const redirectTo=window.location.origin+'/?recovery=1';
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
      if(error)throw error;
      toast('If the account exists, check your email for a password-reset link.');
    }catch(error){
      console.error('Privacy request password reset failed',error);
      toast('Password reset could not be started.');
    }finally{
      if(button.isConnected){button.disabled=false;button.textContent='Forgot password'}
    }
  }

  async function requestRemoval(){
    if(!session?.user?.id||!confirmRemoval?.checked)return;
    submitRemoval.disabled=true;submitRemoval.textContent='Submitting…';
    try{
      const {data,error}=await client.rpc('request_account_removal',{p_source:'web'});
      if(error)throw error;
      const request=Array.isArray(data)?data[0]:data;
      const created=request?.created_at?new Date(request.created_at).toLocaleString():new Date().toLocaleString();
      setResult(removalResult,`Application account removal request recorded on ${created}. Keep this page for your records.`,true);
      confirmRemoval.checked=false;
      toast('Account removal request recorded.');
    }catch(error){
      console.error('Application account removal request failed',error);
      setResult(removalResult,'The request could not be recorded. Your account has not been changed. Please try again.',false);
    }finally{
      if(submitRemoval.isConnected){submitRemoval.disabled=!confirmRemoval.checked;submitRemoval.textContent='Submit account removal request'}
    }
  }

  async function submitInquiry(){
    if(!session?.user?.id)return;
    const input=document.querySelector('#privacyInquiryMessage');
    const message=input?.value.trim()||'';
    const button=document.querySelector('#submitPrivacyInquiry');
    if(message.length<20)return toast('Please add a little more detail to your privacy inquiry.');
    if(message.length>2000)return toast('Privacy inquiries may contain at most 2000 characters.');
    button.disabled=true;button.textContent='Submitting…';
    try{
      const {data,error}=await client.rpc('submit_privacy_inquiry',{p_message:message,p_source:'web'});
      if(error)throw error;
      const request=Array.isArray(data)?data[0]:data;
      const created=request?.created_at?new Date(request.created_at).toLocaleString():new Date().toLocaleString();
      setResult(inquiryResult,`Privacy inquiry recorded on ${created}.`,true);
      if(input)input.value='';
      toast('Privacy inquiry recorded.');
    }catch(error){
      console.error('Privacy inquiry failed',error);
      setResult(inquiryResult,error?.message||'The privacy inquiry could not be recorded. Please try again.',false);
    }finally{
      if(button.isConnected){button.disabled=false;button.textContent='Submit privacy inquiry'}
    }
  }

  async function init(){
    if(!window.supabase?.createClient||!cfg.supabaseUrl||!cfg.supabasePublishableKey){
      authStatus.textContent='Privacy request service is temporarily unavailable.';
      authForm.hidden=true;
      return;
    }
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await client.auth.getSession();
    session=data?.session||null;
    client.auth.onAuthStateChange((_event,next)=>{session=next;render()});
    render();
  }

  authForm?.addEventListener('submit',signIn);
  document.querySelector('#privacyResetPassword')?.addEventListener('click',resetPassword);
  document.querySelector('#privacySignOut')?.addEventListener('click',()=>client?.auth.signOut());
  confirmRemoval?.addEventListener('change',()=>{submitRemoval.disabled=!confirmRemoval.checked});
  submitRemoval?.addEventListener('click',requestRemoval);
  document.querySelector('#submitPrivacyInquiry')?.addEventListener('click',submitInquiry);
  init().catch(error=>{console.error('Privacy request initialization failed',error);authStatus.textContent='Privacy request service is temporarily unavailable.'});
})();
