#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SIGNED_APK="${1:-${LMU_CONNECT_SIGNED_APK:-$HOME/lmu-signing/output/LittleMinds-Connect-1.0.0-signed.apk}}"
PRODUCTION_ORIGIN="${LMU_PRODUCTION_URL:-https://www.littlemindsuniverse.co.za}"
EXPECTED_NETLIFY_SITE_ID='989d3b15-5ba4-42f7-8ba6-b53dc64fbd27'
EXPECTED_RELEASE_BRANCH='release/connect-play-readiness'

fail(){ printf 'FAIL: %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail 'git is required.'
command -v node >/dev/null 2>&1 || fail 'Node.js is required.'
command -v npm >/dev/null 2>&1 || fail 'npm is required.'
command -v netlify >/dev/null 2>&1 || fail 'Netlify CLI is required. Install/login to Netlify CLI first.'

CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
CURRENT_COMMIT="$(git rev-parse HEAD 2>/dev/null || true)"
[ "$CURRENT_BRANCH" = "$EXPECTED_RELEASE_BRANCH" ] || fail "Run this controlled deployment only from $EXPECTED_RELEASE_BRANCH (current: ${CURRENT_BRANCH:-unknown})."
git diff --quiet && git diff --cached --quiet || fail 'Tracked repository changes are present. Use the clean release clone only.'

[ -f .netlify/state.json ] || fail 'This clone is not linked to a Netlify project (.netlify/state.json is missing).'
LINKED_SITE_ID="$(node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('.netlify/state.json','utf8'));process.stdout.write(String(s.siteId||''));")"
[ "$LINKED_SITE_ID" = "$EXPECTED_NETLIFY_SITE_ID" ] || fail "Wrong Netlify project link: expected $EXPECTED_NETLIFY_SITE_ID, got ${LINKED_SITE_ID:-none}."

echo '=== RELEASE IDENTITY ==='
printf 'repo: %s\n' "$ROOT"
printf 'branch: %s\n' "$CURRENT_BRANCH"
printf 'commit: %s\n' "$CURRENT_COMMIT"
printf 'Netlify site ID: %s\n' "$LINKED_SITE_ID"
printf 'signed APK: %s\n' "$SIGNED_APK"
printf 'production: %s\n' "$PRODUCTION_ORIGIN"

echo
echo '=== LOCKED DEPENDENCIES ==='
npm ci --ignore-scripts

echo
echo '=== SOURCE / TEST / BUILD GATE ==='
npm run check

echo
echo '=== PREPARE EXACT DEPLOYABLE DIST ==='
npm run prepare:connect-play-release -- "$SIGNED_APK"

echo
echo '=== NETLIFY LOGIN / PROJECT CHECK ==='
netlify status

echo
echo '=== PRODUCTION DEPLOY OF PREBUILT DIST ==='
# Netlify manual deploy uploads the already-built directory; it does not rebuild the source tree.
netlify deploy --prod --dir=dist

echo
echo '=== POST-DEPLOY PRODUCTION GATE ==='
# Netlify manual deploys are atomic, but allow a few short retries for DNS/CDN edge convergence.
for attempt in 1 2 3 4; do
  if npm run verify:play-production -- "$PRODUCTION_ORIGIN"; then
    echo
    echo 'CONNECT PLAY WEB RELEASE GATE: GREEN'
    exit 0
  fi
  if [ "$attempt" -lt 4 ]; then
    echo "Production verification attempt $attempt did not pass yet; retrying after 5 seconds..."
    sleep 5
  fi
done

fail 'Production deployment completed but the Play production verification gate did not pass.'
