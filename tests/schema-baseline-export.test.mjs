import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/export-lmu-schema-baseline.sh', import.meta.url), 'utf8');

test('schema baseline exporter uses a read-only schema dump command', () => {
  assert.match(script, /supabase db dump --db-url "\$SUPABASE_DB_URL" -f/);
  assert.doesNotMatch(script, /supabase\s+db\s+(?:pull|push|reset)/);
  assert.doesNotMatch(script, /--data-only|--role-only/);
});

test('schema baseline exporter protects credentials and output files', () => {
  assert.match(script, /SUPABASE_DB_URL/);
  assert.match(script, /umask 077/);
  assert.match(script, /chmod 700/);
  assert.match(script, /chmod 600/);
  assert.match(script, /Refusing to overwrite/);
  assert.doesNotMatch(script, /echo\s+["']?\$SUPABASE_DB_URL/);
});

test('schema baseline exporter rejects an unexpected data COPY block', () => {
  assert.match(script, /COPY \.* FROM stdin/);
});
