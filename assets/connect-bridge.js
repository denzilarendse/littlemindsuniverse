(function(){
  const replacements=new Map([
    ['WhatsApp may mirror permitted updates through the LittleMindsUniverse business identity.','LittleMinds Connect keeps permitted classroom updates inside the verified LittleMindsUniverse relationship.'],
    ['Private teacher and family numbers are not exposed. WhatsApp mirrors permitted updates through the LittleMindsUniverse business identity.','Private teacher and family phone numbers are not exposed. LittleMinds Connect keeps permitted updates inside the verified classroom relationship.'],
    ['WhatsApp mirror','LittleMinds Connect'],
    ['Demo mode never sends WhatsApp or production messages.','Demo mode never sends production Connect messages.'],
    ['Private teacher and guardian phone numbers are never exposed. WhatsApp, when enabled, is a separate privacy-minimised mirror through the LittleMindsUniverse business identity.','Private teacher and guardian phone numbers are never exposed. LittleMinds Connect is the relationship-authorized communication channel.'],
    ['Approval is the release point. WhatsApp delivery, when enabled later, is a separate provider workflow and is not triggered by this screen.','Approval releases the report to authorized guardian views. Messaging remains inside LittleMinds Connect and is not triggered automatically by this screen.']
  ]);

  function patchText(root=document.body){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const changes=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      let value=node.nodeValue;
      for(const [from,to] of replacements){
        if(value?.includes(from))value=value.split(from).join(to);
      }
      if(value!==node.nodeValue)changes.push([node,value]);
    }
    for(const [node,value] of changes)node.nodeValue=value;
  }

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
    card.innerHTML='<b>LittleMinds Connect is live.</b> Use the standalone Connect experience for replies, read state and realtime conversation updates. <a class="tiny" href="/connect.html">Open Connect</a>';
    const first=content.firstElementChild;
    content.insertBefore(card,first||null);
  }

  function apply(){
    patchText();
    ensureConnectLauncher();
    enhanceMessagingView();
  }

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{
      scheduled=false;
      apply();
    });
  });

  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  apply();
})();