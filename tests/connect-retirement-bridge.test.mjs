import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const app = read('assets/app.js');
const reports = read('assets/teacher-reports.js');
const bridge = read('assets/connect-bridge.js');
const sw = read('sw.js');

test('embedded LMU loads the Connect bridge after the application bundle', () => {
  const appIndex = html.indexOf('/assets/app.js');
  const bridgeIndex = html.indexOf('/assets/connect-bridge.js');
  assert.ok(appIndex >= 0, 'LMU application bundle must load');
  assert.ok(bridgeIndex > appIndex, 'Connect bridge must load after the application bundle');
  assert.match(sw, /\/assets\/connect-bridge\.js/);
});

test('production frontend source no longer emits WhatsApp-era user-facing copy', () => {
  const productionFrontend = app + '\n' + reports + '\n' + bridge;
  assert.doesNotMatch(productionFrontend, /WhatsApp/i);
  assert.match(productionFrontend, /LittleMinds Connect/);
});

test('Connect bridge only enhances navigation and messaging UX without restoring provider behavior', () => {
  assert.match(bridge, /LittleMinds Connect is live/);
  assert.match(bridge, /href='\/connect\.html'|href="\/connect\.html"/);
  assert.match(bridge, /MutationObserver/);
  assert.doesNotMatch(bridge, /fetch\s*\(|XMLHttpRequest|sendBeacon|WHATSAPP_ACCESS_TOKEN|phone_e164/i);
});
