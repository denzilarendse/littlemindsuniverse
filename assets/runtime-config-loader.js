(function(){
  window.LMU_CONFIG_READY=(async function(){
    try{
      const response=await fetch('/api/runtime-config',{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)return;
      const config=await response.json();
      if(config?.environment!=='preview'||typeof config.supabaseUrl!=='string'||typeof config.supabasePublishableKey!=='string')return;
      if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl))return;
      if(!(config.supabasePublishableKey.startsWith('sb_publishable_')||config.supabasePublishableKey.startsWith('eyJ')))return;
      window.LMU_CONFIG=Object.freeze({...window.LMU_CONFIG,environment:'preview',supabaseUrl:config.supabaseUrl,supabasePublishableKey:config.supabasePublishableKey});
    }catch(error){
      // Netlify and local development retain their existing static configuration.
      console.info('Preview runtime override not applied');
    }
  })();
})();
