# Android owner-controlled signing and Digital Asset Links

Status: prepared, but not complete until the owner creates the upload key, signs the release candidate, and supplies the Google Play app-signing SHA-256 certificate fingerprint for Digital Asset Links.

## Security boundary

- Never commit a `.jks`, `.keystore`, `key.properties`, passwords, or Play credentials.
- Keep the upload key under owner control. Back it up securely in at least two owner-controlled locations.
- Google Play App Signing should hold the production app-signing key. The local key is the upload key.
- Digital Asset Links must use the **Google Play app-signing certificate SHA-256 fingerprint** for Play-distributed builds, not merely the local upload-key fingerprint.

## Termux / local signing setup

From the canonical repository, first verify Java/keytool exists:

```sh
java -version
keytool -help >/dev/null
```

Create an owner-only signing directory and generate the upload key interactively. Do not put passwords on a command line or into shell history:

```sh
mkdir -p "$HOME/.lmu-signing"
chmod 700 "$HOME/.lmu-signing"
keytool -genkeypair -v \
  -keystore "$HOME/.lmu-signing/lmu-upload-key.jks" \
  -alias lmu-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
chmod 600 "$HOME/.lmu-signing/lmu-upload-key.jks"
```

Create `android/key.properties` locally. It is already gitignored:

```properties
storeFile=/absolute/path/to/.lmu-signing/lmu-upload-key.jks
storePassword=OWNER_LOCAL_SECRET
keyAlias=lmu-upload
keyPassword=OWNER_LOCAL_SECRET
```

Protect the file:

```sh
chmod 600 android/key.properties
```

## Build and verify the signed AAB

```sh
npm ci --ignore-scripts
npm run check
npm run android:sync
cd android
./gradlew clean bundleRelease
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

The Gradle configuration signs only when `android/key.properties` exists. CI intentionally omits that file and continues producing the independently testable unsigned release-candidate bundle.

## Play App Signing

In Google Play Console:

1. Create the LittleMindsUniverse app with package `za.co.littlemindsuniverse`.
2. Enable Google Play App Signing.
3. Upload the owner-signed AAB using the upload key.
4. Record both the upload-certificate SHA-256 and the **app-signing certificate SHA-256**. Keep the distinction explicit in release evidence.

## Generate Digital Asset Links

Once the Play app-signing SHA-256 fingerprint is available, return to the repository root and run:

```sh
npm run android:assetlinks -- "AA:BB:CC:...:FF"
```

This creates:

```text
.well-known/assetlinks.json
```

The generated file is locked to package `za.co.littlemindsuniverse`. Review and commit it, deploy it to the production domain, and verify that it is publicly available at:

```text
https://www.littlemindsuniverse.co.za/.well-known/assetlinks.json
```

The Android manifest already declares the same HTTPS host with `android:autoVerify="true"`.

## Device verification after installation

After installing the Play/internal-track artifact on a physical Android device, use Android tooling where available to confirm the verified app-link state and then open a production LMU HTTPS link. Record the package version, artifact digest, device/OS version, and result in the release evidence.

Do not mark the signing, Digital Asset Links, physical-device, or Play gates green until those checks are performed against the exact candidate artifact.
