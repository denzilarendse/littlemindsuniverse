import {assertUuid} from './memory-validation.js';

const learnerActions=new Set(['read_academic_history','read_memory','read_memory_history','propose_memory','dispute_memory','withdraw_memory']);
const teacherActions=new Set(['read_academic_history','read_memory','read_memory_history','propose_memory','confirm_memory','update_memory','dispute_memory','withdraw_memory']);
const parentActions=new Set();

export function createMiloAuthorizer({isLearnerOwner,teacherCanAccess,parentHasConsent,isTrustedServiceActor}={}){
  for(const [name,fn] of Object.entries({isLearnerOwner,teacherCanAccess,parentHasConsent,isTrustedServiceActor})){
    if(typeof fn!=='function')throw new TypeError('Missing fail-closed authorization resolver: '+name);
  }
  return {
    async canAccessLearner({actor,learnerId,action}){
      if(!actor?.profileId||!['learner','teacher','parent','admin','service'].includes(actor.role))return false;
      try{assertUuid(actor.profileId,'actor profile id');assertUuid(learnerId,'learner id');}catch{return false;}
      if(typeof action!=='string'||!action)return false;
      if(actor.role==='learner')return learnerActions.has(action)&&Boolean(await isLearnerOwner({profileId:actor.profileId,learnerId}));
      if(actor.role==='teacher')return teacherActions.has(action)&&Boolean(await teacherCanAccess({profileId:actor.profileId,learnerId,action}));
      if(actor.role==='parent')return parentActions.has(action)&&Boolean(await parentHasConsent({profileId:actor.profileId,learnerId,action}));
      if(actor.role==='service')return action==='expire_memory'&&Boolean(await isTrustedServiceActor({profileId:actor.profileId}));
      return false;
    }
  };
}

export function createSupabaseMiloAuthorizer({authenticatedProfileId,accessToken,get,rpc}={}){
  if(!authenticatedProfileId||!accessToken||typeof get!=='function'||typeof rpc!=='function')throw new TypeError('Authenticated profile, access token and Supabase adapters are required');
  assertUuid(authenticatedProfileId,'authenticated profile id');
  return createMiloAuthorizer({
    isLearnerOwner:async({profileId,learnerId})=>{
      if(profileId!==authenticatedProfileId)return false;
      const query='learners?select=id&'+
        'id=eq.'+encodeURIComponent(learnerId)+'&'+
        'user_id=eq.'+encodeURIComponent(profileId)+'&active=eq.true&limit=1';
      const result=await get(query);
      return Array.isArray(result)&&result.length===1;
    },
    teacherCanAccess:async({profileId,learnerId})=>{
      if(profileId!==authenticatedProfileId)return false;
      return await rpc(accessToken,'can_access_learner',{p_learner_id:learnerId})===true;
    },
    parentHasConsent:async()=>false,
    isTrustedServiceActor:async()=>false
  });
}
