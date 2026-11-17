import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../assets/blueprint-rooms.js',import.meta.url),'utf8');
function createRooms(){
  const values=new Map();
  const localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const window={};
  vm.runInNewContext(source,{window,localStorage,Date,WeakSet,JSON,Math,Number,String,Object,Array,RegExp,console});
  return {rooms:window.LMU_ROOMS,values};
}
const demo={mode:'demo',role:'learner',stage:'discovery',learner:{},mastery:[]};
const live={mode:'live',role:'learner',stage:'discovery',learner:{},mastery:[]};

test('all blueprint rooms render their named surfaces',()=>{
  const {rooms}=createRooms();
  for(const [id,label,role,stage] of [
    ['playworld','PlayWorld','learner','discovery'],['storyverse','StoryVerse Library','learner','discovery'],
    ['career','Career Galaxy','learner','pathfinder'],['adult','Adult Academy','admin','edge'],
    ['creator','Creator Studio','learner','pathfinder'],['community','Community Garden','learner','pathfinder'],
    ['parent','Parent Hub','parent','discovery'],['teacher','Teacher Studio','teacher','discovery'],['admin','Admin Console','admin','discovery']
  ]){
    const html=rooms.render(id,{...demo,role,stage});
    assert.ok(html.includes(label),id+' should render '+label);
  }
});

test('PlayWorld and StoryVerse offer complete demo happy paths',()=>{
  const {rooms}=createRooms();
  assert.match(rooms.render('playworld',demo),/Maths Race/);
  assert.match(rooms.render('storyverse',demo),/The Curious Seed/);
  assert.match(rooms.render('storyverse',demo),/Read book/);
});

test('live room surfaces explicitly disable demo writes',()=>{
  const {rooms}=createRooms();
  const html=rooms.render('playworld',live);
  assert.match(html,/Live data boundary/);
  assert.match(html,/disabled/);
  assert.doesNotMatch(html,/shared demo progress record only/);
});

test('age and role restrictions are enforced by room renderer',()=>{
  const {rooms}=createRooms();
  assert.match(rooms.render('admin',demo),/Access restricted/);
  assert.match(rooms.render('parent',demo),/Access restricted/);
  assert.match(rooms.render('teacher',demo),/Access restricted/);
  assert.match(rooms.render('career',{...demo,stage:'foundation'}),/Access restricted/);
  assert.match(rooms.render('adult',{...demo,stage:'edge'}),/Access restricted/);
});

test('Community Garden has pre-moderation and no direct-message affordance',()=>{
  const {rooms}=createRooms();
  const html=rooms.render('community',{...demo,stage:'pathfinder'});
  assert.match(html,/held for moderation/);
  assert.match(html,/no private direct messages/i);
  assert.doesNotMatch(html,/data-room-action="direct-message"/);
});

test('shell loads the rooms module before app initialization and routes all rooms',()=>{
  const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
  assert.ok(index.indexOf('blueprint-rooms.js')<index.indexOf('/assets/app.js'));
  for(const id of ['playworld','storyverse','career','adult','creator','community','parent','teacher','admin'])assert.ok(app.includes(id+':()=>window.LMU_ROOMS.render'));
  assert.match(app,/window\.LMU_ROOMS\?\.wire\(state\)/);
});
