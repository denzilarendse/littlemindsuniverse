import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTutorPolicy,
  normalizeSessionMode,
  normalizeStage,
  selectMiloEngine
} from '../api/_lib/milo-orchestrator.js';

test('Early Explorers route number play to early learning',()=>{
  assert.equal(selectMiloEngine({stageCode:'EE24',subject:'Mathematics',message:'Count three apples'}),'early_learning');
});

test('Early Explorers route stories and drawing to Play & Story',()=>{
  assert.equal(selectMiloEngine({stageCode:'EE24',message:'Tell me a short story and let me draw it'}),'play_story');
});

test('coding, language and AI intents route to specialist engines',()=>{
  assert.equal(selectMiloEngine({stageCode:'DB810',message:'Help me debug my JavaScript loop'}),'coding_ai');
  assert.equal(selectMiloEngine({stageCode:'F57',message:'Practise English vocabulary and pronunciation'}),'voice_language');
  assert.equal(selectMiloEngine({stageCode:'CA1113',message:'How does machine learning bias happen?'}),'ai_literacy');
});

test('assessment always routes to reasoning missions and assessment session mode',()=>{
  assert.equal(selectMiloEngine({stageCode:'DB810',message:'help',assessment:true}),'reasoning_missions');
  assert.equal(normalizeSessionMode('project',{assessment:true}),'assessment');
});

test('assessment tutor policy caps assistance and requires first attempt',()=>{
  const policy=buildTutorPolicy({assessment:true,helpLevel:5,stageCode:'DB810'});
  assert.equal(policy.maxAssistanceLevel,1);
  assert.equal(policy.directAnswerPolicy,'guided_only');
  assert.equal(policy.requireFirstAttempt,true);
  assert.equal(policy.requireTransferCheck,true);
  assert.equal(policy.teacherApprovalRequired,true);
});

test('stage normalization prefers trusted stage code over spoofed age',()=>{
  assert.equal(normalizeStage('DB810',3).code,'DB810');
  assert.equal(normalizeStage('',3).code,'EE24');
});
