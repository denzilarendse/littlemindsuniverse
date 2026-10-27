import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const moduleSource = fs.readFileSync(new URL('../assets/milo-transcription.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('teacher Milo transcription module is loaded after the chat application', () => {
  assert.match(html, /assets\/app\.js/);
  assert.match(html, /assets\/milo-transcription\.js/);
  assert.ok(html.indexOf('/assets/app.js') < html.indexOf('/assets/milo-transcription.js'));
});

test('teacher chat exposes dictation, local voice-note preview and transcript export', () => {
  for (const label of [
    'Dictate message',
    'Record voice note',
    'Export chat transcript (.txt)',
    'Use transcript in message',
    'Discard voice note'
  ]) assert.ok(moduleSource.includes(label), 'Missing control: ' + label);
  assert.match(moduleSource, /SpeechRecognition\s*\|\|\s*window\.webkitSpeechRecognition/);
  assert.match(moduleSource, /MediaRecorder/);
  assert.match(moduleSource, /text\/plain;charset=utf-8/);
});

test('transcription module keeps recordings local and does not upload learner or teacher media', () => {
  assert.match(moduleSource, /Audio notes stay on this device/);
  assert.match(moduleSource, /Audio is not uploaded/);
  assert.doesNotMatch(moduleSource, /\.storage\.from\s*\(/);
  assert.doesNotMatch(moduleSource, /fetch\s*\(/);
});

test('voice notes have bounded duration and file size and clean up microphone tracks', () => {
  assert.match(moduleSource, /MAX_NOTE_BYTES\s*=\s*20\s*\*\s*1024\s*\*\s*1024/);
  assert.match(moduleSource, /MAX_NOTE_MS\s*=\s*3\s*\*\s*60\s*\*\s*1000/);
  assert.match(moduleSource, /getTracks\(\)\.forEach/);
  assert.match(moduleSource, /beforeunload/);
});
