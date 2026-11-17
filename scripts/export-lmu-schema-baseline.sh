#!/usr/bin/env bash
set -euo pipefail
set +x

# Export schema only. Never export production rows or place credentials in Git.
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL in your local shell; do not paste it into chat or commit it.}"
command -v supabase >/dev/null 2>&1 || { echo "Supabase CLI is required." >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/database/baselines"
OUT="$OUT_DIR/lmu-production-schema.sql"
mkdir -p "$OUT_DIR"
TMP="$(mktemp "$OUT_DIR/.lmu-schema.XXXXXX.sql")"
trap 'rm -f "$TMP"' EXIT

HELP="$(supabase db dump --help 2>&1 || true)"
if grep -q -- '--db-url' <<<"$HELP"; then
  supabase db dump --db-url "$SUPABASE_DB_URL" --schema public,private --file "$TMP"
elif grep -q -- '--remote' <<<"$HELP"; then
  supabase db dump --remote="$SUPABASE_DB_URL" --schema public,private --file "$TMP"
else
  echo "This Supabase CLI version exposes neither --db-url nor --remote for db dump." >&2
  exit 1
fi

test -s "$TMP" || { echo "Dump is empty; refusing to publish it." >&2; exit 1; }
if grep -Eiq '^(COPY |INSERT INTO |SELECT pg_catalog\.setval)' "$TMP"; then
  echo "Dump appears to contain row data; refusing to publish it." >&2
  exit 1
fi
grep -Eiq '^CREATE TABLE ' "$TMP" || { echo "No CREATE TABLE statements found." >&2; exit 1; }
grep -Eiq '^CREATE FUNCTION |^CREATE OR REPLACE FUNCTION ' "$TMP" || {
  echo "No application functions found; inspect dump scope before accepting it." >&2
  exit 1
}

mv "$TMP" "$OUT"
trap - EXIT
(
  cd "$ROOT"
  sha256sum database/baselines/lmu-production-schema.sql
)
echo "Schema-only export written to: $OUT"
echo "Review the SQL for credentials, environment-specific owners, unsupported extensions and Supabase-managed dependencies before committing."
