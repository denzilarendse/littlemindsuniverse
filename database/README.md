# Database package

The web app is wired to the existing LittleMindsUniverse Supabase project and its RLS-protected tables.

## Important bootstrap boundary

The files in `database/migrations/` are the curated LMU migration **delta set** carried in this repository. They are not yet a complete empty-database bootstrap for every migration in the live Supabase ledger.

See `docs/LIVE-MIGRATION-PARITY-20261003.md` for the verified mapping and disaster-recovery implications.

`production-notes.sql` contains idempotent hardening/index guidance that can be reviewed before applying.

Never place a service-role or secret key in browser code.
