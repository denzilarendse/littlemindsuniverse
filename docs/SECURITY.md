# Security and child-safety baseline

- Browser/PWA code uses only the Supabase publishable key; service-role/secret credentials remain server-side only.
- RLS is required on all exposed user-data tables and relationship predicates must be correlated to the row being accessed.
- SECURITY DEFINER functions use controlled `search_path` settings and are not executable by `PUBLIC`.
- Authorization is based on database relationships and trusted app-controlled claims, never user-editable metadata.
- Classroom membership and learner-active state are revalidated on protected classroom flows.
- Guardian access requires a verified guardian/learner relationship; report, evidence and class-message permissions are additionally enforced where relevant.
- Learner evidence is stored in private storage. Learners access their own evidence, verified guardians require evidence permission, and teachers see only approved/reviewable evidence for learners they may access.
- LittleMinds Connect replaces WhatsApp as the product communication layer. No phone-number discovery, public learner directory or unrestricted adult-to-child messaging is permitted.
- Connect message mutations use reviewed RPCs; clients do not directly mutate conversation/member/message tables.
- Learner Connect accounts remain notification/read-only until a separately reviewed age-safe policy explicitly enables interaction.
- Teacher approval gates academic publishing, interventions, enrichment and reports.
- Assessment help defaults to level 0 or 1 and assistance is auditable.
- Learner Milo teaches, asks for attempts and avoids doing submitted work for the learner.
- Guardian consent gates child media evidence. Pending evidence expires after 7 days; approved photo/video after 30 days; approved audio after 7 days according to the approved LMU retention policy.
- Payment providers handle card details; LMU must not store card credentials. Price, identity, settlement and entitlement remain server-authoritative.
- Production HTTP responses use CSP, HSTS, MIME sniffing protection, referrer controls, permissions policy, frame protection and cross-origin opener hardening.
- Harmful-content filtering, age-aware responses and adult escalation belong in the production Milo safety layer.

Security tests are not modified merely to make a failure disappear. A failing gate is root-caused, minimally repaired and fully retested.
