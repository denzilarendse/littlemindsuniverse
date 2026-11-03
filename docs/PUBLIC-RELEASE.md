# Public web and Android release pipeline

This repository includes a gated public-release workflow at `.github/workflows/public-release.yml`.

## What it verifies

The workflow installs locked dependencies, audits shipped runtime dependencies, runs the full LMU verification/build suite, syncs the production web bundle into Android, and builds release APK/AAB artifacts.

## Netlify production deployment

Production deployment uses the existing root `netlify.toml`, `dist` output and `netlify/functions` adapters. The workflow deploys only on a push to `main`, and only when these GitHub Actions secrets are configured:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

The Netlify token must remain a repository secret and must never be committed. After deployment the workflow performs a homepage smoke check and calls the Netlify health function.

## Signed public Android APK

The repository never stores signing keys. To produce a publicly distributable release APK/AAB, configure these GitHub Actions secrets:

- `LMU_ANDROID_KEYSTORE_BASE64`
- `LMU_ANDROID_STORE_PASSWORD`
- `LMU_ANDROID_KEY_ALIAS`
- `LMU_ANDROID_KEY_PASSWORD`

When all four are present on a push to `main`, the workflow writes the keystore only into the ephemeral GitHub runner, builds the release APK/AAB, verifies the APK signature, uploads the signed artifacts, and copies the APK into `dist/downloads/LittleMindsUniverse-1.0.apk` before the Netlify deployment.

If signing material is not present, the workflow produces only an unsigned release candidate. It does not mislabel an unsigned or debug build as a production APK.

## Release boundaries

A successful workflow does not waive LMU's child-safety, privacy, guardian-consent, teacher-control, Supabase authorization, physical-device, or store-review requirements. Google Play publication still requires owner-controlled Play Console steps and the Play app-signing certificate for Digital Asset Links.


## Canonical production hostname (mandatory)

The only approved public production hostname is **https://www.littlemindsuniverse.co.za**.

- The primary Netlify production site must remain `littlemindsuniverse-app` (site ID `989d3b15-5ba4-42f7-8ba6-b53dc64fbd27`).
- Public links, canonical metadata and production smoke tests must use the www hostname.
- If the apex domain is configured, it must redirect to the www hostname over HTTPS.
- Netlify-generated site URLs and Deploy Preview/branch URLs are for deployment operations and testing only; do not advertise them as the public production site.
- Before production promotion, verify the site ID, primary custom domain, TLS, apex redirect (if configured), canonical response and exact source SHA provenance. If any required check is unverified, hold production promotion.
- Do not modify DNS or custom-domain assignments without explicit owner authorization.

The repository policy does not itself change provider-side domain assignments. Netlify domain configuration must be inspected and verified separately.
