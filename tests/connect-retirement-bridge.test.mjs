import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const app = read('assets/app.js');
const reports = read('assets/teacher-reports.js');
const bridge = read('assets/connect-bridge.js');
const sw = read('sw.js');

test('embedded LMU loads the Connect enhancement after the main application bundle', () => {
  const appIndex = html.indexOf('/assets/app.js');
  const bridgeIndex = html.indexOf('/assets/connect-bridge.js');
  assert.ok(appIndex >= 0, 'LMU application bundle must load');
  assert.ok(bridgeIndex > appIndex, 'Connect enhancement must load after the main application bundle');
  assert.match(sw, /\/assets\/connect-bridge\.js/);
});

test('current user-facing application and report source use only the in-app communication model', () => {
  assert.doesNotMatch(app, /WhatsApp/i);
  assert.doesNotMatch(reports, /WhatsApp/i);
  assert.doesNotMatch(bridge, /WhatsApp/i);
  assert.match(app, /LittleMinds Connect/);
  assert.match(reports, /LittleMinds Connect/);
});

test('Connect enhancement exposes the standalone in-app experience without provider behavior', () => {
  assert.match(bridge, /LittleMinds Connect is live/);
  assert.match(bridge, /data-lmu-connect-launcher/);
  assert.match(bridge, /href='\/connect\.html'|href="\/connect\.html"/);
  assert.match(bridge, /MutationObserver/);
  assert.doesNotMatch(bridge, /fetch\s*\(|XMLHttpRequest|sendBeacon|phone_e164/i);
});
