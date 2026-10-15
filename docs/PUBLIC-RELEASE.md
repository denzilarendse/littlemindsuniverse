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
