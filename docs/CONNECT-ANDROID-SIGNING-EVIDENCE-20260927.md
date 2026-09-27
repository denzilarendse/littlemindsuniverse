# LittleMinds Connect — Owner Signing Evidence — 2026-09-27

Status: owner-controlled upload key created; exact standalone Connect AAB signed and cryptographically verified locally by the owner.

## App identity

- Play display name: `LittleMinds Connect`
- Android package: `za.co.littlemindsuniverse.connect`
- Version: `1.0.0`
- Version code: `1`

## Source candidate

The unsigned standalone Connect AAB originated from the verified `main` Android release candidate for commit:

`6c27158e15ddb09b3b8ebe8761f426e7cad02312`

Unsigned AAB SHA-256:

`fe3b0b2a29b898232b114188cb1cde2a9af3eaeb811ba1ed96ae5a259b127adc`

The owner independently verified this digest before signing.

## Owner upload certificate

The owner generated a Connect-specific upload key locally in owner-controlled Termux private storage. No keystore bytes, passwords, or key material were shared or committed to source control.

Alias:

`connect-upload`

Certificate owner:

`CN=LittleMinds Connect Upload, O=LittleMindsUniverse, C=ZA`

Upload certificate SHA-256:

`E9:BB:1E:07:82:AA:8B:19:55:0E:74:2F:E2:F5:9C:49:A0:34:5A:FD:D6:54:47:CE:23:73:4C:64:34:45:25:D5`

Certificate validity observed during verification: 2026-09-27 through 2054-02-12.

## Signed AAB evidence

Signed AAB SHA-256:

`e4462f1061e74c1132b0baf5461a20c0ee233317d01f21d55ee3e0e89f4c6fd0`

`jarsigner -verify -verbose -certs` reported:

- signature verified;
- signed by `CN=LittleMinds Connect Upload, O=LittleMindsUniverse, C=ZA`;
- digest algorithm SHA-256;
- signature algorithm SHA256withRSA with a 4096-bit key;
- `jar verified`.

`keytool -printcert -jarfile` independently reported the same owner certificate and the exact SHA-256 fingerprint above.

The self-signed certificate-chain warning is expected for an owner-generated upload certificate and does not alter the verified signature result.

## Remaining signing / Play gates

- [x] Create owner-controlled Connect-specific upload key.
- [x] Sign exact verified Connect AAB.
- [x] Verify signed AAB and upload-certificate fingerprint.
- [ ] Back up the upload keystore in at least two owner-controlled secure locations.
- [ ] Create the Play Console app for `za.co.littlemindsuniverse.connect`.
- [ ] Enable / confirm Google Play App Signing.
- [ ] Upload this signed AAB to Internal testing.
- [ ] Record Google Play app-signing certificate SHA-256.
- [ ] Publish Digital Asset Links using the Play app-signing certificate.
- [ ] Install the Play-distributed internal-track build on a physical Android device and run the Connect E2E test matrix.

## Security boundary

The upload-key password and keystore remain owner-controlled and must never be added to Git, CI artifacts, chat messages, screenshots, or public storage. The upload-certificate fingerprint is public verification metadata and may be recorded in release evidence.
