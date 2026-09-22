# LittleMindsUniverse Release Candidate RC1

Source-of-truth candidate generated from the September 22, 2026 release mission workspace.

- Archive: `release/LMU-release-candidate-20260922.tar.xz`
- SHA-256: `c252997cd527fc93abf048384c67dbd09e93d43715d987c3d45a942ad6290a50`
- Frozen general-purpose 8/8 v1.0.0 skill: unchanged.
- Existing production USD pricing rows: unchanged.
- Purpose: clean-CI verification without modifying `main` until the candidate passes release gates.

The candidate excludes local secrets, `.env.local`, Vercel local metadata, generated `dist/`, `node_modules/`, and historical backup files.
