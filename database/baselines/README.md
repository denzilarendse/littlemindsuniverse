# LMU production schema baseline

This directory is reserved for a sanitised, authoritative schema-only snapshot of the canonical LMU Supabase project.

## Why this baseline is required

The repository's checked-in `database/migrations/` folder is a curated delta set, not the complete historical bootstrap. The live project has 97 migration-ledger entries, while the branch carries 47 SQL migration files. Reconstructing missing historical files by inventing SQL or duplicating already-applied changes is unsafe.

## Export procedure

Run this on an owner-controlled machine with the Supabase CLI installed. Keep the database URL in a local environment variable; never paste it into chat, a ticket, shell history, or Git.

```bash
export SUPABASE_DB_URL='postgresql://...'
./scripts/export-lmu-schema-baseline.sh
unset SUPABASE_DB_URL
```

The script exports only application schemas `public,private` and refuses obvious row-data statements. It does not export production rows. The output is:

`database/baselines/lmu-production-schema.sql`

Before committing the dump, review it locally for:
- credentials, literal secrets, private endpoints and environment-specific owners;
- extension dependencies and extension-owned objects;
- default privileges and role grants;
- functions/triggers/policies referencing Supabase-managed `auth` or `storage` objects;
- any unexpected data statements or embedded configuration.

Do not add Auth users, learner/guardian/teacher records, Storage objects, or other production data. Do not include service-role keys or database passwords.

## Supabase-managed dependencies

The default Supabase schema dump excludes managed schemas such as `auth`, `storage`, and extension-created schemas. This is intentional. Record required customizations to those schemas separately and recreate them only in the disposable test environment after review. Do not blindly dump/restore managed Supabase schemas.

The baseline must be accompanied by a short manifest recording:
- source project ref and export time (no credentials);
- PostgreSQL major/minor version;
- included schemas;
- installed extension names and versions;
- migration ledger count and latest version;
- SHA-256 of the dump;
- explicit confirmation that no table data was exported.

## Replay target

The existing isolated project `LMU-V45-TESTING` is on the Free organization plan and uses PostgreSQL 17.11.0.011. It was restored from its paused state during this phase and is being brought online. It is a disposable test target, not production.

Once the baseline is available and reviewed, restore it into that empty test target (or a fresh local PostgreSQL 17/Supabase stack), then apply the two room migrations in timestamp order. Compare the resulting schema, grants, policies, indexes and functions against the canonical production metadata. Do not apply anything to the production project.

## Important limits

A schema-only snapshot represents the current production schema; it does not recover the original 97 historical migration source files or their original sequencing. It enables a trustworthy current-state baseline replay plus validation of new migrations. Historical migration provenance remains documented separately.
