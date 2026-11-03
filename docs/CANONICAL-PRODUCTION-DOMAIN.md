# Canonical Production Domain Policy

**Status:** Mandatory release invariant  
**Canonical public production URL:** https://www.littlemindsuniverse.co.za  
**Netlify production site:** littlemindsuniverse-app  
**Netlify site ID:** 989d3b15-5ba4-42f7-8ba6-b53dc64fbd27

## Rules

1. The only approved public production hostname is `www.littlemindsuniverse.co.za`.
2. Public-facing documentation, canonical metadata, support materials and production smoke tests must use `https://www.littlemindsuniverse.co.za`.
3. The primary custom domain on the canonical Netlify site must remain the www hostname.
4. If the apex hostname `littlemindsuniverse.co.za` is configured, it must redirect permanently to the www hostname over HTTPS.
5. Netlify-generated `*.netlify.app` URLs, Deploy Previews and branch deploys are operational/testing endpoints only. They are not the public production website.
6. A preview must never be described as production.
7. Before every authorized production promotion, verify:
   - exact Netlify site ID and site name;
   - primary custom domain is the www hostname;
   - HTTPS/TLS is valid;
   - apex-to-www redirect works, if apex is configured;
   - canonical production URL responds correctly;
   - deployed commit SHA and artifact provenance match the approved source SHA.
8. If any required domain or provenance check is unverified, fail closed and hold production promotion.
9. Do not change DNS records, domain assignments, or production deployment state without explicit owner authorization.

## Current provider evidence

A read-only Netlify inspection returned:
- Site name: `littlemindsuniverse-app`
- Site ID: `989d3b15-5ba4-42f7-8ba6-b53dc64fbd27`
- Provider-reported primary site URL: `https://www.littlemindsuniverse.co.za`
- Current published deploy ID: `6ac32e778f64ae1e8cf84c65`, state `ready`

The available project inspection did not enumerate all custom-domain aliases or prove the apex redirect, TLS certificate details, or source-SHA parity. Those remain verification gates, not assumed facts.

## Enforcement boundary

This policy is committed as repository governance. It does not itself change Netlify's custom-domain configuration, DNS, or redirect behaviour. Provider-side settings must be inspected separately. If a change is required, obtain explicit owner authorization before applying it.
