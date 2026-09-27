# LittleMinds Connect — owner-controlled Android signing

Status: prepared. Do not mark signing or Play gates green until the owner creates and protects the Connect upload key, signs the exact candidate, and the Play-distributed artifact is verified.

## Frozen identity

- App name: `LittleMinds Connect`
- Package: `za.co.littlemindsuniverse.connect`
- Android module: `android/connectapp`
- Minimum SDK: 24
- Target / compile SDK: 36

## Security boundary

- Never commit a `.jks`, `.keystore`, `key.properties`, password, recovery code, Play credential or signing certificate private key.
- Use a **Connect-specific upload key** rather than automatically reusing the LittleMindsUniverse upload key.
- Keep at least two owner-controlled backups of the upload keystore.
- Do not paste keystore passwords into ChatGPT, GitHub, issue comments, shell commands or screenshots.
- Use Google Play App Signing for the production app-signing key. The local Connect key is the upload key.
- Digital Asset Links for Play-distributed builds must use the **Google Play app-signing certificate SHA-256** fingerprint, not merely the local upload-key fingerprint.

## 1. Verify owner tooling

From Termux or another owner-controlled environment:

```sh
java -version
keytool -help >/dev/null
```

Java/keytool must be available before continuing.

## 2. Generate the Connect upload key interactively

Do not place passwords on the command line.

```sh
mkdir -p "$HOME/.lmu-signing"
chmod 700 "$HOME/.lmu-signing"

keytool -genkeypair -v \
  -keystore "$HOME/.lmu-signing/lmu-connect-upload-key.jks" \
  -alias lmu-connect-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

chmod 600 "$HOME/.lmu-signing/lmu-connect-upload-key.jks"
```

Use a strong owner-only password when `keytool` prompts. Store that password in the owner's password manager, not in the repository.

## 3. Back up the keystore before release

Before uploading any signed bundle to Play, make two owner-controlled backups. Do not use a public/shared Git repository or send the key through chat/email.

Verify the source and backup files have matching SHA-256 digests using an owner-local command such as:

```sh
sha256sum "$HOME/.lmu-signing/lmu-connect-upload-key.jks" /path/to/secure-backup/lmu-connect-upload-key.jks
```

The two digests must match. The digest is safe to record as release evidence; the keystore and passwords are not.

## 4. Create local Connect signing properties

Create this ignored file:

`android/connectapp/key.properties`

with:

```properties
storeFile=/absolute/path/to/.lmu-signing/lmu-connect-upload-key.jks
storePassword=OWNER_LOCAL_SECRET
keyAlias=lmu-connect-upload
keyPassword=OWNER_LOCAL_SECRET
```

Protect it:

```sh
chmod 600 android/connectapp/key.properties
```

The file is intentionally ignored by Git. Never commit it.

## 5. Build the exact signed candidate

Start from a clean checkout of the exact approved release SHA. Then:

```sh
npm ci --ignore-scripts
npm run check
npm run android:connect:sync
cd android
./gradlew :connectapp:clean :connectapp:bundleRelease
```

Expected bundle:

`android/connectapp/build/outputs/bundle/release/connectapp-release.aab`

Verify the AAB is signed:

```sh
jarsigner -verify -verbose -certs connectapp/build/outputs/bundle/release/connectapp-release.aab
```

Record the candidate digest:

```sh
sha256sum connectapp/build/outputs/bundle/release/connectapp-release.aab
```

Do not proceed if verification reports the release bundle is unsigned.

## 6. Record the upload certificate fingerprint

This fingerprint identifies the local **upload** certificate, not the Google Play production app-signing certificate:

```sh
keytool -list -v \
  -keystore "$HOME/.lmu-signing/lmu-connect-upload-key.jks" \
  -alias lmu-connect-upload
```

Record only the SHA-256 certificate fingerprint in release evidence. Do not share passwords or the private keystore.

## 7. Google Play App Signing

In Play Console:

1. Create/select **LittleMinds Connect** with package `za.co.littlemindsuniverse.connect`.
2. Enable Google Play App Signing.
3. Upload the owner-signed AAB using the Connect upload key.
4. Record the upload-certificate SHA-256.
5. Record the separate **app-signing certificate SHA-256** shown by Play.

Keep the two fingerprints clearly labelled; they serve different purposes.

## 8. Digital Asset Links

Once the Play app-signing SHA-256 fingerprint is available, return to the repository root and run:

```sh
npm run android:connect:assetlinks -- "AA:BB:CC:...:FF"
```

This generates a Connect-specific candidate file under `.well-known/` locked to package:

`za.co.littlemindsuniverse.connect`

The production `/.well-known/assetlinks.json` must ultimately contain the required statement(s) for every Android package that should verify against `www.littlemindsuniverse.co.za`. Do not overwrite the LMU statement accidentally when adding Connect.

## 9. Internal-track device verification

After Play produces the internal-track build, install that Play-distributed artifact on a physical Android device and verify:

- correct app name/icon;
- sign in / sign out / session persistence;
- relationship-authorized contacts;
- conversation open, send, reply and read flow for permitted adult roles;
- learner restrictions remain enforced;
- realtime message arrival and reconnect behavior;
- no random/phone-number discovery path;
- verified `/connect...` app link opens LittleMinds Connect;
- browser fallback remains correct when the app is not installed;
- no unexpected camera, microphone, contacts or location permission request.

Record the exact AAB digest, Play release/version code, device model, Android version and results.

## Release rule

A locally signed bundle is **not** a Play release. Keep the gate open until the exact signed candidate is uploaded, Play App Signing evidence is recorded, Digital Asset Links is published/verified, the Play-distributed internal-track build is tested on a physical device, and the remaining Play policy/pre-launch gates are green.
