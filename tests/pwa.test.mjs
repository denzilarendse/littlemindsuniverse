import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const connectHtml=fs.readFileSync(new URL('../connect.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('PWA manifest and HTML expose the install shell',()=>{
  assert.equal(manifest.name,'LittleMindsUniverse');
  assert.ok(manifest.short_name);
  assert.equal(manifest.start_url,'/');
  assert.equal(manifest.scope,'/');
  assert.equal(manifest.display,'standalone');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length>0);
  assert.match(html,/rel="manifest" href="\/manifest\.json"/);
  assert.match(connectHtml,/rel="manifest" href="\/manifest\.json"/);
  assert.match(app,/serviceWorker\.register\('\/sw\.js'\)/);
});

test('service worker caches both LMU and Connect offline shells but never intercepts API requests',()=>{
  for(const resource of [
    '/index.html',
    '/connect.html',
    '/assets/app.css',
    '/assets/connect.css',
    '/assets/accessibility.css',
    '/assets/runtime-config.js',
    '/assets/data.js',
    '/assets/parent-controls.js',
    '/assets/teacher-reports.js',
    '/assets/app.js',
    '/assets/connect-bridge.js',
    '/assets/connect-app.js',
    '/manifest.json',
    '/assets/icon.svg'
  ]){
    assert.ok(sw.includes(`'${resource}'`),`missing service-worker core asset ${resource}`);
  }
  assert.match(sw,/url\.pathname\.startsWith\('\/api\/'\).*return/s);
  assert.match(sw,/filter\(key=>key!==CACHE\)/);
  assert.match(sw,/url\.pathname==='\/connect\.html'\|\|url\.pathname==='\/connect'/);
  assert.match(sw,/caches\.match\('\/connect\.html'\)/);
  assert.match(sw,/caches\.match\('\/index\.html'\)/);
});

test('service worker cannot cache authenticated cross-origin or arbitrary same-origin data responses',()=>{
  assert.match(sw,/url\.origin!==self\.location\.origin\) return/);
  assert.match(sw,/const CACHEABLE_PATHS=new Set\(CORE\)/);
  assert.match(sw,/response\.ok&&CACHEABLE_PATHS\.has\(url\.pathname\)/);
  assert.doesNotMatch(sw,/lmu-production-v8/);
  assert.match(sw,/lmu-production-v9/);
});
