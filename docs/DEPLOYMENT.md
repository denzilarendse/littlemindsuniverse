# Deployment

## 1. Local Android validation
1. Extract the ZIP into `/storage/emulated/0/Development/LittleMindsUniverse`.
2. In Termux: `cd /storage/emulated/0/Development/LittleMindsUniverse`.
3. Run `npm test`.
4. Run `npx serve . -l 5500`.
5. Open `http://localhost:5500` in Chrome.

## 2. Supabase
The package points to the existing LMU project using a browser-safe publishable key. The live database remains protected by RLS. Do not add a service-role or secret key to `runtime-config.js`.

## 3. Vercel
Import the repository and add the variables from `.env.example`. Milo will return 503 until `GROQ_API_KEY` is configured. WhatsApp and PayFast remain unavailable until their respective secrets are configured.

## 4. Netlify
The PWA can be deployed as a static site using `netlify.toml`. If you keep server APIs on Vercel, set `apiBase` in `assets/runtime-config.js` to the Vercel origin. Alternatively port the API handlers into Netlify Functions.

## 5. Release gate
Before public release: sign in with real learner, teacher and parent test accounts; verify RLS negative tests; verify teacher approval; verify Sunday help limits; verify consent/media retention jobs; configure payment webhooks and WhatsApp templates; test offline install; run Supabase security/performance advisors; verify mobile layout; confirm production domain and email callbacks.
