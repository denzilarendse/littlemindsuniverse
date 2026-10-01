(function(){
  function ensureConnectLauncher(){
    const actions=document.querySelector('.top-actions');
    if(!actions||actions.querySelector('[data-lmu-connect-launcher]'))return;
    const link=document.createElement('a');
    link.href='/connect.html';
    link.className='pill';
    link.dataset.lmuConnectLauncher='true';
    link.textContent='Connect';
    link.setAttribute('aria-label','Open LittleMinds Connect');
    actions.insertBefore(link,actions.lastElementChild||null);
  }

  function enhanceMessagingView(){
    const active=document.querySelector('[data-view="messages"].active');
    if(!active)return;
    const content=document.querySelector('.content');
    if(!content||content.querySelector('[data-lmu-connect-full-app]'))return;
    const card=document.createElement('div');
    card.className='notice ok';
    card.dataset.lmuConnectFullApp='true';
    card.style.marginBottom='14px';
    card.innerHTML='<b>LittleMinds Connect is live.</b> Use the dedicated Connect experience for relationship-authorized classroom conversations, replies and read state. <a class="tiny" href="/connect.html">Open Connect</a>';
    content.insertBefore(card,content.firstElementChild||null);
  }

  function apply(){
    ensureConnectLauncher();
    enhanceMessagingView();
  }

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;apply()});
  });

  observer.observe(document.body,{subtree:true,childList:true});
  apply();
})();