(function(){
const templates={
  starter:{
    label:'JavaScript starter',
    code:"const learner = 'Milo';\nconsole.log('Hello, ' + learner + '!');"
  },
  sequence:{
    label:'Sequence',
    code:"let total = 0;\nfor (const value of [2, 4, 6]) {\n  total += value;\n}\nconsole.log(total);"
  },
  function:{
    label:'Function',
    code:"function double(n) {\n  return n * 2;\n}\nconsole.log(double(7));"
  }
};

function runJavaScript(source,{timeoutMs=1200,onResult}={}){
  const code=String(source||'').slice(0,12000);
  const safeTimeout=Math.max(300,Math.min(2000,Number(timeoutMs)||1200));
  if(!code.trim()){
    onResult?.({ok:false,output:'Write some JavaScript first.'});
    return ()=>{};
  }
  const workerSource=`
    self.fetch=undefined;
    self.XMLHttpRequest=undefined;
    self.WebSocket=undefined;
    self.EventSource=undefined;
    self.importScripts=undefined;
    self.caches=undefined;
    self.indexedDB=undefined;
    const format=value=>{
      try{
        if(typeof value==='string')return value;
        return JSON.stringify(value);
      }catch{return String(value)}
    };
    self.onmessage=event=>{
      const lines=[];
      const console={
        log:(...args)=>lines.push(args.map(format).join(' ')),
        warn:(...args)=>lines.push('WARN: '+args.map(format).join(' ')),
        error:(...args)=>lines.push('ERROR: '+args.map(format).join(' '))
      };
      try{
        const fn=new Function('console','"use strict";\n'+String(event.data||''));
        const result=fn(console);
        if(result&&typeof result.then==='function')throw new Error('Async code is disabled in this learning sandbox.');
        self.postMessage({ok:true,output:lines.join('\\n')||'Program finished with no console output.'});
      }catch(error){
        self.postMessage({ok:false,output:String(error&&error.message||error).slice(0,800)});
      }
    };
  `;
  const blob=new Blob([workerSource],{type:'text/javascript'});
  const url=URL.createObjectURL(blob);
  const worker=new Worker(url);
  let settled=false;
  const finish=result=>{
    if(settled)return;
    settled=true;
    clearTimeout(timer);
    worker.terminate();
    URL.revokeObjectURL(url);
    onResult?.(result);
  };
  worker.onmessage=e=>finish(e.data||{ok:false,output:'No result returned.'});
  worker.onerror=e=>finish({ok:false,output:String(e.message||'Sandbox error').slice(0,800)});
  const timer=setTimeout(()=>finish({ok:false,output:'Program stopped because it ran too long.'}),safeTimeout);
  worker.postMessage(code);
  return ()=>finish({ok:false,output:'Program stopped.'});
}

window.LMU_CODING=Object.freeze({
  templates:Object.freeze(Object.fromEntries(Object.entries(templates).map(([k,v])=>[k,Object.freeze({...v})]))),
  runJavaScript
});
})();