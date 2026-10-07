import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/milo.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('Milo learner prompt is mastery-first personal teaching rather than answer delivery',()=>{
  assert.match(api,/Personal teacher and learning-coach contract/);
  assert.match(api,/genuine understanding and independent problem-solving/);
  assert.match(api,/Do not move to the next major concept until the learner demonstrates reasonable understanding/);
  assert.match(api,/ask one short check-for-understanding question or give one mini exercise/);
  assert.match(api,/explain the specific misconception kindly/);
  assert.match(api,/Prefer practical exercises, authentic tasks and real-world analogies/);
  assert.match(api,/reviewed mastery snapshot to notice repeated difficulty/);
  assert.match(api,/key takeaways, a quick revision, 3-5 practice questions, and one practical task/);
});

test('Milo supports explicit learner coaching modes',()=>{
  for(const command of ['Explain simply','Go deeper','Quiz me','Exam mode','Revise']){
    assert.ok(api.includes('When the learner says "'+command+'"'), 'missing server mode '+command);
    assert.ok(app.includes('data-milo-command="'+command+'"'), 'missing learner control '+command);
  }
});

test('recent conversation context is privacy-limited and used only for learner tutoring continuity',()=>{
  assert.match(api,/function normalizeRecentTurns\(value\)/);
  assert.match(api,/value\.slice\(-8\)/);
  assert.match(api,/slice\(0, 1200\)/);
  assert.match(api,/\.\.\.\(role === 'learner' \? recentTurns : \[\]\)/);
  assert.match(app,/state\.chat\.slice\(-8\)/);
  assert.match(app,/recentTurns:recentTurns/);
  assert.doesNotMatch(api,/learner_skill_mastery[^\n]*(insert|update|upsert)/i);
});

test('Milo UI explains the coaching model to the learner',()=>{
  assert.match(app,/I will explain it simply, teach one useful step at a time, check your understanding, and adjust from your answers/);
  assert.match(app,/Milo teaches in small steps, checks understanding, revisits weak concepts and keeps assessed work as your own/);
});
