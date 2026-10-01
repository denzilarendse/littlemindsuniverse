# Deployment

## 1. Local Android-first validation
1. Clone or extract the canonical repository into `/storage/emulated/0/Development/LittleMindsUniverse`.
2. In Termux: `cd /storage/emulated/0/Development/LittleMindsUniverse`.
3. Run `npm ci --ignore-scripts` when the lockfile is available in the local checkout.
4. Run `npm run lint` and `npm test`.
5. Run `npm run build`. If an Android/aarch64-native dependency ever prevents a local build, do not bypass the failure; use the verified GitHub/Vercel CI build path and record the architecture limitation.
6. For local browser testing run `npx serve . -l 5500` and open `http://localhost:5500` in Chrome.

## 2. Supabase
The web/PWA points to the existing LMU Supabase project using a browser-safe publishable key. The live database is protected by RLS and reviewed RPCs. Never add a service-role or secret key to `assets/runtime-config.js`, committed HTML/JS or a mobile bundle.

Database changes are forward migrations. Do not rewrite historical applied migrations merely to make tests green.

## 3. LittleMinds Connect
- `/connect.html` is the standalone Connect web surface.
- The main LMU shell links to the same relationship-authorized messaging backend.
- External phone-number messaging provider secrets/endpoints are outside the deployment architecture.
- Realtime uses the existing Supabase HTTPS/WSS origins.
- Messaging must remain available to legitimate users independently of premium lesson entitlement.

## 4. Vercel
Import/deploy the repository and add the server-only variables from `.env.example`. The production build command is `npm run build` and the output directory is `dist`.

Milo requires its configured provider key. PayFast requires its merchant/provider secrets for live payment verification. A successful Vercel build proves the configured deployment can build; it does not by itself prove the custom production domain, real-account E2E or provider settlement flow.

## 5. Netlify
`netlify.toml` runs the same production build and serves `dist`. Netlify function adapters reuse the tested API handlers. Security headers are kept in parity with Vercel. Do not assume the production Netlify site is GitHub-connected unless that connection is explicitly configured and verified.

## 6. Controlled school pilot mode

The Stage 8 live-test candidate uses explicit pilot flags in `assets/runtime-config.js`:

- `pilotMode: true`
- `pilotPaymentsRequired: false`

This removes PayFast settlement as a blocker for controlled school testing only. It does **not** bypass authentication, Connect relationship authorization, RLS/RPC rules, teacher approval, guardian consent, assessment-help limits or Milo safety controls.

Validate a hosted pilot with:

```bash
npm run verify:pilot -- https://www.littlemindsuniverse.co.za
```

Do not use `--pilot` as evidence for a commercial production launch. Before paid public launch, rerun the production probe with `--require-payfast` and complete provider settlement/ITN evidence.

Pilot feedback is submitted through the authenticated `submit_pilot_feedback` RPC. Testers are told not to include passwords, phone numbers, private learner conversations or unnecessary personal information.

## 7. Release gate
Before public release, evidence must cover all of the following:

- exact source SHA and green clean CI;
- live RLS/RPC/storage negative authorization checks;
- learner, parent, teacher and admin authentication lifecycle;
- LittleMinds Connect parent/teacher send/read/realtime behavior and learner safety restrictions;
- teacher approval and assessment-help restrictions;
- consent/media retention behavior;
- PayFast provider verification, ITN validation and entitlement settlement;
- production domain/HTTPS and auth callback URLs;
- browser/mobile E2E on the hosted production candidate;
- PWA install, service-worker update and offline behavior;
- backup/restore/rollback evidence;
- mobile layout/accessibility checks;
- Android application ID/signing/Digital Asset Links/API target/AAB/device/Play gates.

Any gate that requires owner credentials, a physical device or a store/provider account remains BLOCKED/UNKNOWN until the evidence is observed.
