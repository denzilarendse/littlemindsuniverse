import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../assets/teacher-report-export.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('weekly report export module is loaded after the existing teacher report UI', () => {
  assert.match(html, /assets\/teacher-reports\.js/);
  assert.match(html, /assets\/teacher-report-export\.js/);
  assert.ok(html.indexOf('/assets/teacher-reports.js') < html.indexOf('/assets/teacher-report-export.js'));
});

test('weekly report export provides text and print/PDF controls without approving drafts', () => {
  assert.match(source, /Export report \(\.txt\)/);
  assert.match(source, /Print \/ Save PDF/);
  assert.match(source, /DRAFT — NOT APPROVED/);
  assert.match(source, /Drafts are not approved results/);
  assert.doesNotMatch(source, /approve_teacher_weekly_report|approveTeacherReport/);
});

test('exports only the selected report fields and revokes temporary download URLs', () => {
  for (const field of ['summary', 'strengths', 'nextSteps', 'homeSupport']) assert.ok(source.includes(field));
  assert.match(source, /URL\.revokeObjectURL/);
  assert.match(source, /lmu-print-report-only/);
});
