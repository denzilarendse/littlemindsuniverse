import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const capacitor=JSON.parse(fs.readFileSync(new URL('../capacitor.config.json',import.meta.url),'utf8'));
const http=fs.readFileSync(new URL('../api/_lib/http.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');

test('Android uses native Capacitor HTTP for API transport',()=>{
  assert.equal(capacitor.server?.androidScheme,'https');
  assert.equal(capacitor.plugins?.CapacitorHttp?.enabled,true);
});

test('API CORS accepts Capacitor browser fallback origins',()=>{
  assert.match(http,/values\.add\('https:\/\/localhost'\)/);
  assert.match(http,/values\.add\('http:\/\/localhost'\)/);
  assert.match(http,/values\.add\('capacitor:\/\/localhost'\)/);
});

test('Milo hides raw WebView fetch failures from learners',()=>{
  assert.match(app,/failed to fetch\|network request failed\|networkerror\|load failed/i);
  assert.match(app,/Milo could not reach the learning service from this device/);
});
