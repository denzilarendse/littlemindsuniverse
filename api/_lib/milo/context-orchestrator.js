import {assertUuid,MiloValidationError} from './memory-validation.js';
export function createMiloContextOrchestrator({academicHistory,memoryService,objectiveResolver}){
 if(!academicHistory||!memoryService||!objectiveResolver)throw new TypeError('Context dependencies required');
 return {async buildMiloContext({actor,learnerId,subject,objectiveId,purpose='teaching'}){
  assertUuid(learnerId,'learner id');
  if(!actor?.profileId)throw new MiloValidationError('Authenticated actor required',401);
  const [history,memories,resolved]=await Promise.all([
   academicHistory.getLearnerAcademicHistory({actor,learnerId,subject}),
   memoryService.getLearnerMemory({actor,learnerId}),
   objectiveResolver.resolve({actor,learnerId,subject:subject||null,objectiveId:objectiveId||null})
  ]);
  const objective=resolved&&resolved.reviewStatus==='reviewed'?resolved:null;
  const allEvidence=(history.masteryEvidence||[]).filter(r=>r&&r.approved!==false&&!['pending','rejected'].includes(r.status));
  const wanted=String(subject||'').trim().toLocaleLowerCase();
  const scopedEvidence=wanted?allEvidence.filter(r=>String(r.subject||'').trim().toLocaleLowerCase()===wanted):allEvidence;
  const unscopedEvidenceCount=wanted?allEvidence.filter(r=>!r.subject).length:0;
  const evidence=scopedEvidence.slice(0,40).map(r=>({
   skillId:r.skillId||r.skill_id||null,
   judgement:r.judgement||r.currentJudgement||r.current_judgement||null,
   assistanceLevel:r.assistanceLevel??r.assistance_level??null,
   independentEvidence:Boolean(r.independentEvidence??r.independent_evidence),
   misconceptionCode:r.misconceptionCode||r.misconception_code||null,
   observedAt:r.observedAt||r.observed_at||null,
   subject:r.subject||null
  }));
  const confirmed=memories.filter(r=>r.status==='confirmed').slice(0,12).map(r=>({
   key:r.memoryKey,category:r.category,value:JSON.stringify(r.value).slice(0,1200),
   confidence:r.confidence,sourceType:r.sourceType
  }));
  const limitations=[];
  if(!objective)limitations.push('No verified curriculum objective was resolved');
  if(unscopedEvidenceCount)limitations.push(unscopedEvidenceCount+' mastery records lacked verified subject provenance and were excluded');
  return {
   learnerId,subject:subject||null,purpose,
   objective:objective?{id:objective.id,grade:objective.grade,subject:objective.subject,title:String(objective.title||'').slice(0,160),provenance:objective.provenance||null,reviewStatus:objective.reviewStatus}:null,
   learningProfile:confirmed,
   academicSignals:{
    historyEvidenceCount:allEvidence.length,evidenceCount:evidence.length,
    independentEvidenceCount:evidence.filter(r=>r.independentEvidence).length,
    assistedEvidenceCount:evidence.filter(r=>!r.independentEvidence).length,
    excludedUnscopedEvidenceCount:unscopedEvidenceCount,
    recentMisconceptionCodes:[...new Set(evidence.map(r=>r.misconceptionCode).filter(Boolean))].slice(0,8),
    evidence:evidence.slice(0,20)
   },
   provenance:{historySources:Object.keys(history),memoryItemCount:confirmed.length,objectiveResolved:Boolean(objective),limitations}
  };
 }};
}
