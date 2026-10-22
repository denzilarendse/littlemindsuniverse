# Milo + OmniRoute configuration

Milo now supports OmniRoute as an optional OpenAI-compatible model gateway. This changes the upstream inference route only; it does not replace LMU's authentication, role/stage resolution, tutor policy, assessment guard, learning-session controls, rate limit, audit trail or teacher-controlled mastery pipeline.

## Server-side environment variables

Set these in the Vercel project's Environment Variables UI. Do not place any of these values in `index.html`, browser JavaScript, the PWA service worker, the Android asset bundle, Git, or chat.

- `MILO_PROVIDER=omniroute`
- `OMNIROUTE_API_KEY=<OmniRoute inference API key>`
- `OMNIROUTE_BASE_URL=https://<your-public-omniroute-host>/v1`
- `MILO_MODEL=auto` (optional; defaults to `auto` when OmniRoute is selected)

The base URL must be a reachable OpenAI-compatible `/v1` endpoint over HTTPS. HTTP is accepted only for loopback development. Use the OmniRoute inference API key, not its management/dashboard credential and not an upstream provider key. OmniRoute's `auto` model can route among providers already configured inside OmniRoute.

Existing deployments can continue using the current Groq configuration by leaving `MILO_PROVIDER` unset (or setting it to `groq`) and retaining `GROQ_API_KEY` / `GROQ_BASE_URL`. If both providers' keys exist, the explicit `MILO_PROVIDER` value selects the route; without it, Groq remains the default.

## Network and deployment requirement

If OmniRoute is running only on the Android phone at `http://localhost:20128`, Vercel cannot reach that process: `localhost` from the Vercel function means the Vercel runtime itself. For hosted LMU, OmniRoute must be available at a stable public HTTPS endpoint, protected by its inference key, with firewall/access restrictions and rate limits. Do not expose an unauthenticated OmniRoute port directly to the internet. A private LAN address or phone-only tunnel is not a production endpoint.

## Safe rollout

1. Configure the variables in a non-production/Preview environment first.
2. Confirm the configured model appears in OmniRoute's `GET /v1/models` response and test a single request from a trusted environment.
3. Run LMU Milo authentication, role/stage, help-level, assessment, rate-limit, and provider-error tests against the preview.
4. Inspect OmniRoute routing/cost logs and confirm no secret or learner conversation content is exposed in application logs.
5. Only after owner review should the same provider selection be enabled in Production. This code change does not itself configure Vercel environment variables or switch the live site.

## Educational safeguards retained

Milo remains a teacher-led learning companion for ages 2–18. It uses eight specialist engine routes, server-trusted learner stage/curriculum/assignment context, six assistance levels, bounded learning sessions, a reviewed mastery snapshot where available, categorical learning-event auditing, and a rule that AI responses do not directly write teacher-approved mastery. Assessment help remains derived from an authorized assigned learning item rather than a client-supplied flag.

OmniRoute changes model/provider routing, not these governance requirements. Different models may behave differently, so the exact selected models still require age-appropriateness, assessment-integrity, and child-safety regression testing before a public rollout.
