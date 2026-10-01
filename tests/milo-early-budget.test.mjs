import test from 'node:test';
import assert from 'node:assert/strict';
import { createMiloReply } from '../api/milo.js';

const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});

test('early learning session budget blocks provider after six tutor turns',async()=>{
  process.env.SUPABASE_URL='https://project.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
  process.env.SUPABASE_SECRET_KEY='sb_secret_test';
  process.env.NINEROUTER_API_KEY='provider-test';
  process.env.NINEROUTER_BASE_URL='https://provider.example/v1';
  process.env.MILO_MODEL='test-model';
  process.env.MILO_MAX_REQUESTS_5M='20';

  const userId='10101010-1010-4010-8010-101010101010';
  const learnerId='20202020-2020-4020-8020-202020202020';
  const sessionId='30303030-3030-4030-8030-303030303030';
  let providerCalls=0;

  global.fetch=async(url)=>{
    const u=String(url);
    if(u.endsWith('/auth/v1/user'))return response({id:userId});
    if(u.includes('/rest/v1/profiles?'))return response([{id:userId,role:'learner'}]);
    if(u.includes('/rest/v1/milo_assistance_events?'))return response([]);
    if(u.includes('/rest/v1/learners?'))return response([{id:learnerId,user_id:userId,birth_date:'2023-01-01',country_code:'ZA',curriculum_code:'CAPS',stage_code:'EE24',home_language:'en',learning_language:'en'}]);
    if(u.includes('/rest/v1/milo_learning_sessions?'))return response([{id:sessionId,profile_id:userId,learner_id:learnerId,learning_item_id:null,engine:'early_learning',session_mode:'learn',status:'active'}]);
    if(u.includes('/rest/v1/milo_learning_events?'))return response(Array.from({length:6},(_,i)=>({id:String(i)})));
    if(u==='https://provider.example/v1/chat/completions'){providerCalls+=1;return response({choices:[{message:{content:'unexpected'}}]})}
    throw new Error('Unexpected request');
  };

  await assert.rejects(
    ()=>createMiloReply({method:'POST',headers:{authorization:'Bearer session'},body:{message:'Count three apples',sessionId,helpLevel:2}}),
    error=>error?.status===409
  );
  assert.equal(providerCalls,0);
});
