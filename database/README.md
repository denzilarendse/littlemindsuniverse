# Database package
The web app is wired to the existing LittleMindsUniverse Supabase project and its RLS-protected tables. `production-notes.sql` contains idempotent hardening/index guidance that can be reviewed before applying. Never place a service-role or secret key in browser code.
