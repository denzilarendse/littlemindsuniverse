# LittleMinds Connect — Website APK Signing Evidence — 2026-09-27

Status: signed standalone Android APK verified by the owner and ready for controlled website distribution.

## App identity

- App name: `LittleMinds Connect`
- Android package: `za.co.littlemindsuniverse.connect`
- Version: `1.0.0`
- Version code: `1`

## Source candidate

The website APK build track was merged to `main` at:

`b380c84327860186fe0e9ffa2fd14d37f122e1bc`

The corresponding `android-verification` workflow passed and produced the unsigned Connect APK artifact.

Unsigned APK SHA-256 verified by the owner before signing:

`6d19d2b581cc37635ae7771d1e9cbd4c7f93c6735ee547b63d1e7a9efbee3480`

## Owner signing identity

Alias:

`connect-upload`

Certificate owner:

`CN=LittleMinds Connect Upload, O=LittleMindsUniverse, C=ZA`

Certificate SHA-256:

`E9:BB:1E:07:82:AA:8B:19:55:0E:74:2F:E2:F5:9C:49:A0:34:5A:FD:D6:54:47:CE:23:73:4C:64:34:45:25:D5`

## Signed APK verification

The owner signed the APK locally with `apksigner` using the Connect-specific owner-controlled keystore. No keystore bytes or passwords were shared or committed.

`apksigner verify --verbose --print-certs` reported:

- `Verifies`
- APK Signature Scheme v2: `true`
- APK Signature Scheme v3: `true`
- signer count: `1`
- signer DN exactly matches the owner certificate above
- signer certificate SHA-256 exactly matches the owner certificate above
- RSA key size: `4096`

Signed APK SHA-256:

`65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb`

Observed signed APK size: approximately `2.9M`.

## Website distribution boundary

The signed APK is intentionally not committed to Git. Website publication must copy the exact owner-signed file into the deployable `downloads/` path only at release time, verify the SHA-256 above immediately before deployment, and deploy over HTTPS.

Future APK updates must be signed with the same owner-controlled signing key so Android can accept them as updates to the installed package.

Google Play distribution remains a separate optional/later track. Website distribution does not imply Play Store review, Play Protect endorsement, or Google Play automatic updates.
