(function(){
  const POLICY='/privacy.html';
  const REQUEST='/account-data-request.html';

  function enhanceFooter(){
    const footer=document.querySelector('.footer');
    if(!footer||footer.querySelector('[data-privacy-links]'))return;
    const links=document.createElement('span');
    links.dataset.privacyLinks='true';
    links.innerHTML=` · <a href="${POLICY}">Privacy Policy</a> · <a href="${REQUEST}">Account &amp; data requests</a>`;
    footer.appendChild(links);
  }

  function enhanceSettings(){
    const candidates=[...document.querySelectorAll('.content .grid.two')];
    const grid=candidates.find(node=>/Language\s*&\s*accessibility/i.test(node.textContent||''));
    if(!grid||grid.querySelector('[data-privacy-settings]'))return;
    const card=document.createElement('div');
    card.className='card';
    card.dataset.privacySettings='true';
    card.innerHTML=`<h2>Privacy &amp; account</h2><p>Review how LittleMindsUniverse handles personal information or submit a verified application-account/data request.</p><div class="actions"><a class="ghost" href="${POLICY}">Privacy Policy</a><a class="danger" href="${REQUEST}">Account &amp; data requests</a></div>`;
    grid.appendChild(card);
  }

  function enhanceAccountDialog(){
    const dialog=document.querySelector('#authDialog');
    const signOut=dialog?.querySelector('#signOutBtn');
    if(!dialog?.open||!signOut)return;
    const actions=signOut.closest('.actions');
    if(!actions||actions.querySelector('[data-account-privacy]'))return;
    const link=document.createElement('a');
    link.className='ghost';
    link.href=REQUEST;
    link.dataset.accountPrivacy='true';
    link.textContent='Privacy & account';
    actions.insertBefore(link,signOut);
  }

  function enhance(){
    enhanceFooter();
    enhanceSettings();
    enhanceAccountDialog();
  }

  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',enhance,{once:true});
  enhance();
})();
