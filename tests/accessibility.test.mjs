import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const indexHtml=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const connectHtml=fs.readFileSync(new URL('../connect.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const sharedCss=fs.readFileSync(new URL('../assets/accessibility.css',import.meta.url),'utf8');
const appCss=fs.readFileSync(new URL('../assets/app.css',import.meta.url),'utf8');

for(const [name,html] of [['LMU',indexHtml],['Connect',connectHtml]]){
  test(`${name} shell carries baseline document accessibility metadata`,()=>{
    assert.match(html,/<html lang="en-ZA">/);
    assert.match(html,/name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
    assert.match(html,/role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
    assert.match(html,/\/assets\/accessibility\.css/);
  });
}

test('main LMU runtime exposes navigation and a semantic main landmark',()=>{
  assert.match(app,/aria-label="Primary navigation"/);
  assert.match(app,/<main class="content">/);
  assert.match(app,/aria-current=/);
});

test('keyboard focus, touch targets and motion preferences are explicitly handled',()=>{
  assert.match(appCss,/focus-visible/);
  assert.match(appCss,/min-height:44px/);
  assert.match(sharedCss,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(sharedCss,/animation-duration:\s*0\.01ms/);
  assert.match(sharedCss,/@media \(forced-colors: active\)/);
});
