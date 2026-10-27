import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const moduleSource = fs.readFileSync(new URL('../assets/teacher-milo-evidence.js', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../database/migrations/20261027_teacher_chat_evidence_quarantine.sql', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('teacher evidence module loads once after the live app and transcription controls', () => {
  assert.match(html, /assets\/app\.js/);
  assert.match(html, /assets\/milo-transcription\.js/);
  assert.match(html, /assets\/teacher-milo-evidence\.js/);
  assert.equal((html.match(/src="\/assets\/milo-transcription\.js"/g) || []).length, 1);
  assert.ok(html.indexOf('/assets/app.js') < html.indexOf('/assets/teacher-milo-evidence.js'));
  assert.ok(html.indexOf('/assets/milo-transcription.js') < html.indexOf('/assets/teacher-milo-evidence.js'));
  assert.match(app, /LMU_TEACHER_EVIDENCE_CONTEXT/);
});

test('teacher upload UI requires a live teacher and an active classroom learner', () => {
  assert.match(moduleSource, /ctx\.mode === 'live' && ctx\.role === 'teacher'/);
  assert.match(moduleSource, /classroom_members/);
  assert.match(moduleSource, /register_teacher_chat_evidence/);
  assert.match(moduleSource, /pending security scan/);
  assert.match(moduleSource, /not been sent to Milo/);
});

test('upload UI allowlists file types, enforces a 20 MiB cap and has no automatic AI/network route', () => {
  for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) assert.ok(moduleSource.includes(mime));
  assert.match(moduleSource, /MAX_FILE_BYTES = 20 \* 1024 \* 1024/);
  assert.match(moduleSource, /upsert: false/);
  assert.doesNotMatch(moduleSource, /fetch\s*\(/);
  assert.doesNotMatch(moduleSource, /api\/milo|milo\.invoke/);
});

test('camera flow has explicit permission, preview, retake, cancel and separate upload', () => {
  for (const control of ['Start camera', 'Take photo', 'Retake', 'Use photo', 'Cancel', 'Upload to private quarantine']) {
    assert.ok(moduleSource.includes(control), 'Missing camera/upload control: ' + control);
  }
  assert.match(moduleSource, /getUserMedia\(\{ video:/);
  assert.match(moduleSource, /stopCamera\(\)/);
  assert.match(moduleSource, /document\.hidden/);
});

test('quarantine migration is private, teacher-scoped, learner-scoped and defaults to pending scan', () => {
  assert.match(migration, /public = false/);
  assert.match(migration, /teacher-chat-evidence-quarantine/);
  assert.match(migration, /status text not null default 'pending_scan'/);
  assert.match(migration, /alter table public\.teacher_chat_evidence enable row level security/);
  assert.match(migration, /teacher_read_own_chat_evidence/);
  assert.match(migration, /teacher_upload_chat_evidence_quarantine/);
  assert.match(migration, /teacher_delete_chat_evidence_quarantine/);\n  assert.match(migration, /delete_teacher_chat_evidence/);\n  assert.match(migration, /deleted_by_profile_id/);
  assert.match(migration, /delete_teacher_chat_evidence/);\n  assert.match(migration, /deleted_by_profile_id/);
  assert.match(migration, /public\.teacher_can_access_learner/);
  assert.match(migration, /revoke all on function public\.register_teacher_chat_evidence/);
  assert.match(migration, /grant execute on function public\.register_teacher_chat_evidence[\s\S]*to authenticated/);
  assert.match(migration, /status in \('pending_scan','scan_passed','scan_failed','teacher_reviewed','deleted'\)/);
  assert.doesNotMatch(migration, /grant update on public\.teacher_chat_evidence to authenticated/i);
});
