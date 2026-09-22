import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('PWA manifest and HTML expose the install shell',()=>{
  assert.equal(manifest.name,'LittleMindsUniverse');
  assert.ok(manifest.short_name);
  assert.equal(manifest.start_url,'/');
  assert.equal(manifest.scope,'/');
  assert.equal(manifest.display,'standalone');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length>0);
  assert.match(html,/rel="manifest" href="\/manifest\.json"/);
  assert.match(app,/serviceWorker\.register\('\/sw\.js'\)/);
});

test('service worker caches the app shell but never intercepts API requests',()=>{
  for(const resource of ['/index.html','/assets/app.css','/assets/runtime-config.js','/assets/data.js','/assets/app.js','/manifest.json','/assets/icon.svg']){
    assert.ok(sw.includes(`'${resource}'`),`missing service-worker core asset ${resource}`);
  }
  assert.match(sw,/url\.pathname\.startsWith\('\/api\/'\).*return/s);
  assert.match(sw,/filter\(key=>key!==CACHE\)/);
  assert.match(sw,/caches\.match\('\/index\.html'\)/);
});
