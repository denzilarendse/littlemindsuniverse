import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('database/migrations/20261014_phase1j_security_hardening.sql', 'utf8');

test('Phase 1J removes direct API execution from trigger-only SECURITY DEFINER functions', () => {
  for (const fn of [
    'initialize_support_group_lifecycle_from_recommendation',
    'sync_teacher_intelligence_recommendation_status',
    'sync_teacher_intelligence_support_outcome'
  ]) {
    assert.match(sql, new RegExp('revoke all on function public\\.' + fn + '\\\(\\\) from public, anon, authenticated, service_role;', 'i'));
  }
});

test('Phase 1J hardening does not weaken RLS or grant client access', () => {
  assert.doesNotMatch(sql, /disable\s+row\s+level\s+security/i);
  assert.doesNotMatch(sql, /grant\s+.*\s+to\s+(anon|authenticated)/i);
});
