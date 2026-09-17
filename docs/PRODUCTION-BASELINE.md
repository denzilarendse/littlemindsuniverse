# LittleMindsUniverse Production Baseline

This branch converts the existing LMU prototype into the production line without discarding the working assets.

## Locked product rules

- Ages 2-18 with stage-specific experiences.
- Country/school curriculum remains primary; CAPS, Cambridge mappings and LittleMinds extensions are adapters/layers.
- Lesson-first, authentic learning. Do not make multiple choice the default academic interaction.
- Learner Milo teaches and requests learner participation; it does not do assessed work for the learner.
- Teacher Milo drafts academic actions; teachers review and approve learner-facing academic actions.
- Parent Milo explains approved progress and home support without inventing evidence.
- Milo help levels are 0-5. Assessment mode defaults to level 0 or 1 and assistance is auditable.
- Mastery is evidence-based and distinguishes independent from assisted evidence.
- Intervention/enrichment groups are temporary, skill-specific and teacher controlled.
- Mon-Thu teaching/practice, Friday revision, Saturday rest, Sunday short authentic assessment.
- Week 1 remains free; premium/trial/sponsored access is enforced separately from learning records.
- Classroom membership lives inside LMU. WhatsApp uses the official business identity for opted-in, privacy-minimised notifications/routed communication.

## Canonical systems

- Source: `denzilarendse/littlemindsuniverse`
- Production development branch: `production-hardening`
- Backend: Supabase project `LittleMindsUniverse`
- Web deployment target: Vercel, with secondary static/PWA hosting only after the same build passes verification.

## Release gates

1. No secret/service-role credential in browser code or repository.
2. RLS enabled on every exposed user-data table.
3. Every SECURITY DEFINER RPC is explicitly audited; anonymous EXECUTE is removed unless intentionally public and proven safe.
4. Privileged functions use a fixed safe search_path and enforce caller authorization.
5. Learner/guardian/teacher access boundaries pass negative tests, not only happy-path tests.
6. Assessment help restrictions are enforced server-side where academic integrity depends on them.
7. Evidence/media requires the correct guardian consent and retention state.
8. Teacher approval gates Milo academic recommendations, reports and published work where required.
9. All primary navigation/actions are tested end-to-end: UI -> API/RPC -> data -> response -> UI.
10. Preview deployment passes before production promotion.

## Current security work

The Supabase security advisor currently reports a mutable `public.set_updated_at` search_path and multiple SECURITY DEFINER functions exposed to `anon` and/or `authenticated`. Do not weaken RLS to clear these findings. Audit function purpose and caller authorization, revoke unnecessary EXECUTE grants, move internal helpers out of exposed API surfaces when practical, and re-run security advisors after each hardening batch.

## Milo API hardening

`api/milo.js` now enforces role-specific system rules, help levels 0-5, assessment restriction to levels 0-1, input limits, correct HTTP error statuses, server-side model configuration and no fake educational answer when the upstream model is unavailable.
