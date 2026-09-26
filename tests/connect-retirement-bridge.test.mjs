import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const app = read('assets/app.js');
const reports = read('assets/teacher-reports.js');
const bridge = read('assets/connect-bridge.js');
const sw = read('sw.js');

const retiredCopy = [
  'WhatsApp may mirror permitted updates through the LittleMindsUniverse business identity.',
  'Private teacher and family numbers are not exposed. WhatsApp mirrors permitted updates through the LittleMindsUniverse business identity.',
  'WhatsApp mirror',
  'Demo mode never sends WhatsApp or production messages.',
  'Private teacher and guardian phone numbers are never exposed. WhatsApp, when enabled, is a separate privacy-minimised mirror through the LittleMindsUniverse business identity.',
  'Approval is the release point. WhatsApp delivery, when enabled later, is a separate provider workflow and is not triggered by this screen.'
];

test('embedded LMU loads the Connect retirement bridge after the legacy application bundle', () => {
  const appIndex = html.indexOf('/assets/app.js');
  const bridgeIndex = html.indexOf('/assets/connect-bridge.js');
  assert.ok(appIndex >= 0, 'LMU application bundle must load');
  assert.ok(bridgeIndex > appIndex, 'Connect bridge must load after the legacy application bundle it patches');
  assert.match(sw, /\/assets\/connect-bridge\.js/);
});

test('every known user-facing WhatsApp-era phrase still emitted by compatibility code has an explicit Connect replacement', () => {
  const compatibilitySource = app + '\n' + reports;
  for (const phrase of retiredCopy) {
    assert.ok(compatibilitySource.includes(phrase), `expected compatibility source phrase missing: ${phrase}`);
    assert.ok(bridge.includes(phrase), `Connect bridge does not retire user-facing copy: ${phrase}`);
  }
});

test('Connect bridge replacements point users to LittleMinds Connect and never restore provider behavior', () => {
  assert.match(bridge, /LittleMinds Connect keeps permitted classroom updates/);
  assert.match(bridge, /LittleMinds Connect is the relationship-authorized communication channel/);
  assert.match(bridge, /Messaging remains inside LittleMinds Connect/);
  assert.match(bridge, /href='\/connect\.html'|href="\/connect\.html"/);
  assert.match(bridge, /MutationObserver/);
  assert.doesNotMatch(bridge, /fetch\s*\(|XMLHttpRequest|sendBeacon|WHATSAPP_ACCESS_TOKEN|phone_e164/i);
});
