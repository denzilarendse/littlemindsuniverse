// Phase 1B candidate engine. Pure function; never performs academic actions.
// Evidence must be loaded by a trusted teacher-authorized server, never supplied by a learner client.
const concern = new Set(['not_yet','developing']);
const strength = new Set(['secure','strong']);
const norm = x => String(x ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export function detectGroupedSignals({classroomId,activeLearnerIds,evidenceRows}) {
  if (!classroomId || !Array.isArray(activeLearnerIds) || !Array.isArray(evidenceRows)) throw new TypeError('Invalid input');
  const active = new Set(activeLearnerIds.map(String)), unique = new Map();
  for (const r of evidenceRows) {
    if (!r?.evidenceId || !r.learnerId || !r.skillId || String(r.classroomId)!==String(classroomId) ||
        !active.has(String(r.learnerId)) || r.teacherReviewed!==true || r.reviewAuthorized!==true ||
        !(concern.has(r.judgement)||strength.has(r.judgement)) || !Number.isFinite(Date.parse(r.observedAt))) continue;
    unique.set(String(r.evidenceId),r);
  }
  const byLearnerSkill = new Map();
  for (const r of unique.values()) {
    const key=JSON.stringify([r.learnerId,r.skillId]);
    if(!byLearnerSkill.has(key)) byLearnerSkill.set(key,[]);
    byLearnerSkill.get(key).push(r);
  }
  const snapshots=[];
  for (const rows of byLearnerSkill.values()) {
    rows.sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt)||String(b.evidenceId).localeCompare(String(a.evidenceId)));
    const latest=rows[0], independent=rows.filter(x=>x.independentEvidence===true).length;
    snapshots.push({learnerId:String(latest.learnerId),skillId:String(latest.skillId),judgement:latest.judgement,
      misconception:norm(latest.misconception), independent, evidenceIds:rows.slice(0,12).map(x=>String(x.evidenceId)),
      contradictoryEvidenceIds:rows.filter(x=>concern.has(latest.judgement)?strength.has(x.judgement):concern.has(x.judgement)).map(x=>String(x.evidenceId)).slice(0,12),
      previous:rows[1]?.judgement??null});
  }
  const candidates=[],groups=new Map(),classes=new Map();
  const emit=(type,skillId,members,key,reason)=>candidates.push({
    signalKey:key,signalType:type,skillId,status:'proposed',source:'teacher_intelligence_v1b',
    confidence:members.every(x=>x.independent>=3)?'high':members.every(x=>x.independent>=2)?'medium':'low',
    evidenceState:members.every(x=>x.independent>=2)?'sufficient':'insufficient',
    rationale:reason,members:members.map(x=>({learnerId:x.learnerId,inclusionReason:`Latest reviewed judgement: ${x.judgement}`,
      evidenceIds:x.evidenceIds,contradictoryEvidenceIds:x.contradictoryEvidenceIds,
      independentEvidenceCount:x.independent})),recommendedAction:'Teacher review required; no automatic intervention or enrichment.'
  });
  for(const s of snapshots) {
    if(concern.has(s.judgement)){
      emit('individual',s.skillId,[s],`individual:${s.skillId}:${s.learnerId}`,'Latest reviewed evidence suggests further learning support.');
      if(s.misconception.length>=4 && s.misconception.length<=120){
        const k=JSON.stringify([s.skillId,s.misconception]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);
      }
      if(!classes.has(s.skillId))classes.set(s.skillId,[]);classes.get(s.skillId).push(s);
    } else emit('enrichment',s.skillId,[s],`enrichment:${s.skillId}:${s.learnerId}`,'Possible strength; not proof of durable mastery.');
    if(s.previous && s.previous!==s.judgement) emit('change',s.skillId,[s],`change:${s.skillId}:${s.learnerId}`,`Reviewed judgement changed from ${s.previous} to ${s.judgement}.`);
  }
  for(const [k,rs] of groups) if(rs.length>=2){
    const [skillId,misconception]=JSON.parse(k);
    emit('group',skillId,rs,`group:${skillId}:${encodeURIComponent(misconception)}`,`Shared teacher-reviewed misconception: ${misconception}`);
  }
  for(const [skillId,rs] of classes) if(rs.length>=3 && rs.length/active.size>=.6)
    emit('class',skillId,rs,`class:${skillId}`,`${rs.length} of ${active.size} active learners show a learning need.`);
  candidates.sort((a,b)=>a.signalKey.localeCompare(b.signalKey));
  return {classroomId:String(classroomId),reviewedEvidenceCount:unique.size,activeLearnerCount:active.size,
    candidates:candidates.slice(0,200),truncated:candidates.length>200,
    insufficientEvidence:candidates.length?null:'No actionable teacher-reviewed signal is supported by current evidence.'};
}
