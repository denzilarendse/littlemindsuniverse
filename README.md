# LittleMindsUniverse — Final Production Package

This package is the deployable LMU web/PWA product shell for ages 2–18. It includes the six age stages, Learner/Teacher/Parent/Admin modes, authentic learning, mastery evidence, teacher-approved Milo recommendations, classroom/intervention concepts, weekly reports, messaging/WhatsApp architecture, access model, PWA support, Milo server API, PayFast server helper, Supabase live integration and a 40-week curriculum structure for every stage.

## Run on Android / Termux
```bash
cd /storage/emulated/0/Development/LittleMindsUniverse
npx serve . -l 5500
```
Then open `http://localhost:5500`.

## Test
```bash
npm test
```

## Production environment variables
Copy `.env.example` into your deployment provider settings. Never put secret keys in browser files.

## Deployment
- Vercel: import repository, set environment variables, deploy.
- Netlify: static frontend works directly; API functions should be adapted to Netlify Functions or keep APIs on Vercel and set `apiBase` in `assets/runtime-config.js`.

See `docs/DEPLOYMENT.md` and `docs/SECURITY.md`.
