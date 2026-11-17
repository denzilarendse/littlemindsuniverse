# LMU schema baseline manifest — template

> Complete only after an owner-controlled schema-only export. Never include credentials, database URLs, user data, or secrets.

- Source Supabase project ref: `zcokxljcsfkrlouzragv`
- Export timestamp (UTC):
- PostgreSQL server version:
- Included schemas: `public,private`
- Installed extensions and versions:
- Live migration ledger count:
- Latest live migration version:
- Dump file: `lmu-production-schema.sql`
- Dump SHA-256:
- Row-data export confirmed absent: YES / NO
- Sanitisation review completed: YES / NO
- Reviewer and review date:

## Review checklist

- [ ] No COPY, INSERT, sequence values, or other table-row data.
- [ ] No passwords, tokens, service-role keys, database URLs, or literal secrets.
- [ ] No environment-specific hostnames or private endpoints.
- [ ] Owners, grants, default privileges and role references reviewed.
- [ ] Extension dependencies and versions documented.
- [ ] References to Supabase-managed `auth`, `storage`, vault or extension schemas documented.
- [ ] Functions, triggers, policies and SECURITY DEFINER search paths reviewed.
- [ ] No managed Supabase schema was blindly exported or scheduled for restore.
- [ ] SHA-256 independently recomputed after sanitisation.
- [ ] Restore target confirmed as disposable `LMU-V45-TESTING` only.

## Restore gate

Do not restore or apply room migrations until the SQL and this manifest have been reviewed. Restore only to the isolated PostgreSQL 17 test project or an isolated local PostgreSQL 17 environment. Verify object parity and security before proceeding. Never run this baseline against production.
