#!/usr/bin/env bash
set -euo pipefail

# Read-only schema export. Never use db pull/db push/db reset here.
# Supply the connection string in SUPABASE_DB_URL; it is never printed.
: "\${SUPABASE_DB_URL:?Set SUPABASE_DB_URL in your local shell; do not commit or paste it}"

command -v supabase >/dev/null 2>&1 || { echo "Supabase CLI is required." >&2; exit 2; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required by supabase db dump." >&2; exit 2; }

out_dir="\${SCHEMA_BASELINE_DIR:-artifacts/lmu-schema-baseline}"
out_file="\${out_dir}/schema.sql"
metadata_file="\${out_dir}/metadata.txt"

if [[ -e "$out_file" || -e "$metadata_file" ]]; then
  echo "Refusing to overwrite an existing baseline artifact in $out_dir" >&2
  exit 3
fi

umask 077
mkdir -p "$out_dir"
chmod 700 "$out_dir"
tmp_file="$(mktemp "$out_dir/.schema.XXXXXX.sql")"
trap 'rm -f "$tmp_file"' EXIT

echo "Exporting schema only. No data or custom roles are requested."
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$tmp_file"

# A schema-only pg_dump must not contain COPY data blocks.
if grep -Eq '^COPY .* FROM stdin;' "$tmp_file"; then
  echo "Unexpected data COPY block detected; refusing to retain this dump." >&2
  exit 4
fi

mv "$tmp_file" "$out_file"
trap - EXIT
chmod 600 "$out_file"

if command -v sha256sum >/dev/null 2>&1; then
  digest="$(sha256sum "$out_file" | awk '{print $1}')"
else
  digest="$(shasum -a 256 "$out_file" | awk '{print $1}')"
fi

{
  printf 'created_utc=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf 'supabase_cli=%s\n' "$(supabase --version 2>/dev/null | tr '\n' ' ')"
  printf 'sha256=%s\n' "$digest"
  printf 'export_mode=schema-only; no data-only or role-only flags\n'
  printf 'managed_schemas=auth,storage,and extension-managed schemas are excluded by the CLI default\n'
  printf 'review_required=inspect Auth/Storage customizations, extension configuration, cron jobs, grants, and secrets separately\n'
} > "$metadata_file"
chmod 600 "$metadata_file"

echo "Schema export saved to: $out_file"
echo "SHA-256: $digest"
echo "No database write, migration, or migration-ledger update was requested."
