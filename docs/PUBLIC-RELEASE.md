# Public web and Android release pipeline

This repository includes a gated public-release workflow at `.github/workflows/public-release.yml`.

## What it verifies

The workflow installs locked dependencies, audits shipped runtime dependencies, runs the full LMU verification/build suite, syncs the production web bundle into Android, and builds release APK/AAB artifacts.

## Netlify production deployment

Production deployment uses the existing root `netlify.toml`, `dist` output and `netlify/functions` adapters. The workflow deploys only on a push to `main`, and only when these GitHub Actions secrets are configured:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

The workflow also checks that `NETLIFY_SITE_ID` equals the approved production project ID for `littlemindsuniverse-app` (`989d3b15-5ba4-42f7-8ba6-b53dc64fbd27`) before it can deploy. This prevents a valid token paired with the wrong site ID from publishing to a similarly named site.

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

## Honest release-gate status

On a push to `main`, the workflow fails **before production deployment** if any of the owner-controlled LMU Android signing secrets or Netlify deployment credentials are missing, if signed LMU APK verification/publication did not complete, or if the exact frozen signed LittleMinds Connect APK is missing from `dist/downloads` or fails its pinned size, SHA-256, or sidecar checks.

The frozen Connect artifact is **3,024,688 bytes**, SHA-256 `65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb`. It is a separate artifact from the LMU APK; the LMU APK must never be substituted. The source repository currently has the checksum sidecar but not the APK binary, so production deployment must remain blocked until the exact owner-signed artifact is recovered into the build's `downloads/` source directory and verified.

After deployment, the workflow smoke-tests the generated Netlify deploy URL and runs `npm run verify:play-production -- https://www.littlemindsuniverse.co.za` against the canonical public domain. That production verifier checks the live site's health/security baseline and downloads the Connect APK to verify its HTTP headers, exact byte size, and SHA-256. A successful build alone does not establish a successful deploy or a working download.

Pull-request runs remain preflight/build verification only: they intentionally do not sign or deploy production artifacts. A green pull-request run is not evidence of a signed APK, a Netlify production deployment, physical-device validation, or store readiness.
