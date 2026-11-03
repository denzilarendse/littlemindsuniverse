# Public web and Android release pipeline

The public-release workflow separates preview verification from production promotion. Runs for the same Git ref are serialized; an active release is not canceled by a newer run.

## Build and preview

The workflow installs locked dependencies, audits shipped runtime dependencies, runs the full LMU verification/build suite, syncs Android bundles, and records the canonical GitHub source SHA plus SHA-256 hashes for deployable files in `dist/build-info.json`.

On a push to `main`, the workflow creates a **draft Netlify preview** (without `--prod`) and verifies:
- the preview homepage;
- the configured `/api/health` route;
- the deployed `build-info.json` source SHA against `GITHUB_SHA`;
- hashes of critical deployed static files.

A successful push workflow therefore means the preview was built and verified. It does **not** mean production was deployed.

## Explicit production promotion

Production promotion is disabled for ordinary pushes. To request production promotion, an owner must manually dispatch `public-release` from `main` and set the required `confirm_production` boolean input to `true`.

The manual run first rebuilds and re-verifies the preview. It then fails closed before production deployment unless:
- all four owner-controlled LMU Android signing secrets are present;
- the signed LMU APK was verified and published into the bundle;
- Netlify credentials are present and target the approved `littlemindsuniverse-app` site ID `989d3b15-5ba4-42f7-8ba6-b53dc64fbd27`;
- the exact frozen signed LittleMinds Connect APK is present and matches its pinned size, SHA-256 and sidecar.

After promotion, the workflow smoke-tests the generated Netlify deploy URL, verifies the deployed source SHA and critical file hashes, and runs `npm run verify:play-production -- https://www.littlemindsuniverse.co.za` to verify the canonical domain and exact Connect APK download.

The manual dispatch is the explicit workflow-level production authorization event. Do not trigger it with `confirm_production=true` until the owner has approved the release.

## Netlify credentials

Configure these GitHub Actions secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

The workflow verifies that `NETLIFY_SITE_ID` equals the approved production site ID above. Keep the token in repository secrets; never commit or print it.

## Signed public Android APK

Configure these owner-controlled GitHub Actions secrets:
- `LMU_ANDROID_KEYSTORE_BASE64`
- `LMU_ANDROID_STORE_PASSWORD`
- `LMU_ANDROID_KEY_ALIAS`
- `LMU_ANDROID_KEY_PASSWORD`

The keystore is written only to the ephemeral GitHub runner. The workflow verifies the signed APK before including it in a production bundle. Unsigned artifacts remain explicitly labelled as candidates.

## Frozen signed LM Connect APK

The production gate requires `dist/downloads/LittleMinds-Connect-1.0.0.apk` with exact size **3,024,688 bytes**, SHA-256 `65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb`, matching checksum sidecar, and a valid APK signature whose signer certificate SHA-256 is `e9bb1e0782aa8b19550e742fe2f59c49a0345afdd65447ce23734c64344525d5` (normalized form of the fingerprint displayed on `download-connect.html`). The workflow uses Android `apksigner` to verify the signature and certificate. The repository currently contains the sidecar but not the APK binary; recover the exact owner-signed artifact before attempting production promotion. An unsigned candidate or the LMU APK is not a substitute.

## Release boundaries

A green PR/preflight run does not prove a signed APK, production deployment, physical-device validation or store readiness. Production promotion requires the manual workflow-dispatch confirmation and all gates above. Google Play publication still requires owner-controlled Play Console steps and the Play app-signing certificate for Digital Asset Links.
