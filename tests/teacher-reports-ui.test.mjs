import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const reports = read('assets/teacher-reports.js');
const html = read('index.html');
const sw = read('sw.js');

test('teacher report UI uses authorization-aware report RPCs', () => {
  for (const name of [
    'get_teacher_report_roster',
    'get_teacher_weekly_reports',
    'create_or_refresh_weekly_report',
    'update_teacher_weekly_report',
    'approve_teacher_weekly_report'
  ]) assert.match(reports, new RegExp(name));
  assert.doesNotMatch(reports, /from\(['"]weekly_reports['"]\)\.(?:insert|update|delete)/);
});

test('teacher approval saves current edits before releasing the report', () => {
  const start = reports.indexOf('async function approveReport');
  assert.ok(start >= 0);
  const block = reports.slice(start, reports.indexOf('\n  let scheduled=', start));
  assert.ok(block.indexOf('await persistDraft') < block.indexOf("client.rpc('approve_teacher_weekly_report'"));
  assert.match(block, /Complete all four report sections before approval/);
  assert.match(block, /Approve this weekly report and release it to authorized guardians/);
});

test('approved reports are read-only and no provider dispatch API is called from the report screen', () => {
  assert.match(reports, /Approved reports are read-only here/);
  assert.doesNotMatch(reports, /reserve_whatsapp_dispatch|complete_whatsapp_dispatch|WHATSAPP_ACCESS_TOKEN/);
});

test('weekly report dates normalize to Monday', () => {
  assert.match(reports, /function mondayISO/);
  assert.match(reports, /const offset=\(date\.getDay\(\)\+6\)%7/);
  assert.match(reports, /Weekly reports start on Monday; the date was adjusted/);
});

test('teacher report module loads before app initialization and remains cached across PWA revisions', () => {
  const moduleIndex = html.indexOf('/assets/teacher-reports.js');
  const appIndex = html.indexOf('/assets/app.js');
  assert.ok(moduleIndex >= 0 && appIndex > moduleIndex);
  assert.match(sw, /const CACHE=['"]lmu-production-v\d+['"]/);
  assert.match(sw, /\/assets\/teacher-reports\.js/);
});