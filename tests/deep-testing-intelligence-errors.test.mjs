import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('assets/app.js','utf8');
const loader=source.slice(source.indexOf('async function loadTeacherIntelligence(){'),source.indexOf('async function refreshTeacherIntelligence(){'));
const panel=source.slice(source.indexOf('function teacherIntelligenceDashboard(){'),source.indexOf('function pilotAnalyticsPanel(){'));
function context(failed,throws=false){
 const state={mode:'live',role:'teacher',classrooms:[{id:'fixture',name:'Fixture class'}],supabase:{rpc:async name=>{if(throws)throw new Error('simulated network rejection');return failed?{data:null,error:{message:'fixture failure'}}:{data:[],error:null}}}};
 const ctx=vm.createContext({state,console:{error(){}},Date,esc:s=>String(s??''),teacherDecisionControls:()=>'',evidenceSummaryText:()=>''});vm.runInContext(loader+panel,ctx);return ctx;
}
test('failed live intelligence requests are displayed as unavailable, not absence of learner signals',async()=>{
 const ctx=context(true);await ctx.loadTeacherIntelligence();assert.match(ctx.teacherIntelligenceDashboard(),/could not be loaded/i);assert.equal(ctx.state.teacherIntelligenceLoadErrors,4);
});
test('successful empty intelligence response retains the genuine empty state',async()=>{
 const ctx=context(false);await ctx.loadTeacherIntelligence();assert.match(ctx.teacherIntelligenceDashboard(),/No live Teacher Intelligence signals/);assert.equal(ctx.state.teacherIntelligenceLoadErrors,0);
});
test('non-live mode clears prior intelligence failure state',async()=>{
 const ctx=context(false);ctx.state.teacherIntelligenceLoadErrors=4;ctx.state.mode='demo';await ctx.loadTeacherIntelligence();assert.equal(ctx.state.teacherIntelligenceLoadErrors,0);
});
test('rejected intelligence RPCs are surfaced as load failures rather than unhandled errors',async()=>{
 const ctx=context(false,true);await assert.doesNotReject(ctx.loadTeacherIntelligence());assert.match(ctx.teacherIntelligenceDashboard(),/could not be loaded/i);assert.equal(ctx.state.teacherIntelligenceLoadErrors,4);
});
