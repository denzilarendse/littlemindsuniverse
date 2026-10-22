import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const moduleSource=fs.readFileSync(new URL('../assets/support-groups.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../database/migrations/20261001171947_architecture_2_support_group_management.sql',import.meta.url),'utf8');

test('support groups load only for authenticated teacher role and visible classroom view',()=>{
  assert.match(moduleSource,/async function ensureTeacher/);
  assert.match(moduleSource,/p\.role!=='teacher'/);
  assert.doesNotMatch(moduleSource,/s\.profile\?\.id===session\.user\.id&&s\.profile\?\.role==='teacher'/);
  assert.match(moduleSource,/setInterval\(\(\)=>\{if\(visible\(\)\)load\(\)\},60000\)/);
  assert.match(moduleSource,/function visible\(\)/);
  assert.match(moduleSource,/data-view="classroom"/);
});

test('support group reads and mutations use the guarded RPC contracts',()=>{
  assert.match(moduleSource,/get_teacher_support_groups/);
  assert.match(moduleSource,/set_support_group_members/);
  assert.match(moduleSource,/close_support_group/);
  assert.match(moduleSource,/p_parent_classroom_id:s\.parentClassroomId/);
  assert.match(moduleSource,/p_group_classroom_id:groupId,p_learner_ids:ids/);
});

test('support group UI has duplicate-submit protection and explicit dissolve confirmation',()=>{
  assert.match(moduleSource,/if\(s\.busy\)return/);
  assert.match(moduleSource,/window\.confirm\('Dissolve this support group\?/);
  assert.match(moduleSource,/if\(data!==true\)throw/);
});

test('support group RPC migration blocks anonymous execution and bounds group membership',()=>{
  assert.match(migration,/revoke all on function public\.get_teacher_support_groups\(uuid\) from public, anon/i);
  assert.match(migration,/revoke all on function public\.set_support_group_members\(uuid,uuid\[\]\) from public, anon/i);
  assert.match(migration,/v_count > 50/);
  assert.match(migration,/Every support-group learner must be an active member of the parent classroom/);
});

test('support group module is loaded before app and cached for offline shell',()=>{
  assert.ok(index.indexOf('/assets/support-groups.js')<index.indexOf('/assets/app.js'));
  assert.ok(sw.includes("'/assets/support-groups.js'"));
});
