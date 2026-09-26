# LittleMindsUniverse brand-asset verification — 2026-09-26

## Scope
This intervention is cosmetic and release-polish only. It does not change authentication, authorization, RLS, Android package identity, SDK levels, permissions, signing, payment behavior, messaging authorization, or curriculum behavior.

## Changes
- Replace the generated Capacitor/Android launcher foreground with the LittleMindsUniverse learning-face/mortarboard motif already used by the web icon.
- Change the adaptive icon background from template white to the LittleMinds navy `#182235`.
- Add regression assertions that reject the old template launcher path and pin the LittleMinds palette/artwork.

## Verification gates
The branch must pass the normal release-verification workflow and the Android verification workflow, including dependency audit, full web checks, Android lint, native unit/instrumentation compilation, API-36 bundle generation, and unsigned artifact upload.

No gate may be bypassed for visual polish.
