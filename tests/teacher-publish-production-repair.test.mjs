import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const migration = fs.readFileSync(
  path.join(root, 'database/migrations/20260927_repair_teacher_publish_and_role_reads.sql'),
  'utf8'
);

test('teacher mapped drafts always write a valid curriculum week', () => {
  assert.match(migration, /v_week\s+smallint/i);
  assert.match(migration, /max\(lwp\.week_number\).*between 1 and 40/is);
  assert.match(migration, /curriculum_code,week_number,day_role,source,status/i);
  assert.match(migration, /coalesce\(c\.curriculum_code,'CAPS'\),v_week,'teaching','teacher','draft'/i);
});

test('RLS-only commercial and classroom predicates live behind a private schema', () => {
  assert.match(migration, /create schema if not exists private/i);
  assert.match(migration, /create or replace function private\.has_commercial_learning_access/i);
  assert.match(migration, /create or replace function private\.learner_in_learning_item_classroom/i);
  assert.match(migration, /grant execute on function private\.has_commercial_learning_access\(uuid, uuid\) to authenticated/i);
  assert.match(migration, /grant execute on function private\.learner_in_learning_item_classroom\(uuid, uuid\) to authenticated/i);

  for (const helper of [
    'has_commercial_learning_access\\(uuid, uuid\\)',
    'has_premium_access\\(uuid\\)',
    'learner_in_learning_item_classroom\\(uuid, uuid\\)'
  ]) {
    assert.match(
      migration,
      new RegExp(`revoke execute on function public\\.${helper} from public, anon, authenticated`, 'i')
    );
  }
});

test('recipient and submission policies use private bounded commercial helpers', () => {
  for (const policy of [
    'allowed_users_read_recipients',
    'learner_updates_own_recipient',
    'teacher_assigns_learning_item',
    'allowed_users_read_submissions',
    'learner_or_verified_guardian_creates_submission',
    'learner_or_verified_guardian_updates_submission'
  ]) {
    assert.match(migration, new RegExp(`alter policy ${policy}`, 'i'));
  }
  assert.match(migration, /private\.has_commercial_learning_access\(learner_id, learning_item_id\)/i);
  assert.match(migration, /private\.learner_in_learning_item_classroom\(learning_item_id, learner_id\)/i);
});

test('weekly report direct reads have the base grant required for RLS evaluation', () => {
  assert.match(migration, /grant select on table public\.weekly_reports to authenticated/i);
  assert.doesNotMatch(migration, /disable row level security/i);
});

test('Connect teacher contacts no longer combine DISTINCT with hidden primary-guardian ordering', () => {
  const teacherBranch = migration.slice(migration.indexOf("elsif v_role = 'teacher'"));
  assert.match(teacherBranch, /return query\s+select\s+c\.id/is);
  assert.doesNotMatch(teacherBranch, /return query\s+select distinct\s+c\.id/is);
  assert.match(teacherBranch, /order by c\.name, l\.display_name, gl\.primary_guardian desc, gp\.display_name/i);
});
