# 🌟 LittleMindsUniverse - Milo AI Live v3.0

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/denzilarendse/littlemindsuniverse)

**Fixed:** No hardcoded API keys - GitHub secret scanning will pass ✅

## 🚀 1-Click Deploy
1. Repo: https://github.com/denzilarendse/littlemindsuniverse
2. Click Deploy button above
3. Add Env Var: `GROQ_API_KEY` = `gsk_...` from https://console.groq.com/keys
4. Deploy -> Live!

## 📦 Full PWA Inside
- `index.html` - Full 72-week CAPS PWA, Milo v3.0 calls `/api/milo` (no secrets)
- `api/milo.js` - Vercel serverless -> Groq Llama 3.1 70B (uses env var)
- `manifest.json` + `sw.js` + `logo.png` - PWA installable
- `worker.js` - Cloudflare alternative

## 🔑 API Key
Get free at https://console.groq.com/keys - 14,400 req/day. NEVER put it in GitHub - only in Vercel Env Vars.

## Why previous upload failed?
Old file had `AQ.Ab8...` Gemini key hardcoded - GitHub blocked it. This version has ZERO secrets in frontend.

Built for SA learners 🇿🇦
