import {assertUuid} from './memory-validation.js';

const learnerActions=new Set(['read_academic_history','read_memory','read_memory_history','propose_memory','dispute_memory','withdraw_memory']);
const teacherActions=new Set(['read_academic_history','read_memory','read_memory_history','propose_memory','confirm_memory','update_memory','dispute_memory','withdraw_memory']);
const parentActions=new Set(['read_academic_history','propose_memory','dispute_memory','withdraw_memory']);

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
