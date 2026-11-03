import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const workflow = fs.readFileSync(path.join(root, '.github/workflows/public-release.yml'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs/PUBLIC-RELEASE.md'), 'utf8');
const gate = fs.readFileSync(path.join(root, 'scripts/verify-public-release-inputs.mjs'), 'utf8');

const provenanceIndex = workflow.indexOf('Write source-to-artifact provenance manifest');
const previewIndex = workflow.indexOf('Deploy release candidate preview to Netlify');
const previewSmokeIndex = workflow.indexOf('Smoke-test SHA-bound Netlify preview');
const gateIndex = workflow.indexOf('Enforce production release gate before deploy');
const deployIndex = workflow.indexOf('Deploy production web app to Netlify');
const smokeIndex = workflow.indexOf('Smoke-test Netlify production deploy');

assert.ok(provenanceIndex >= 0, 'source provenance must be written before deploy');
assert.ok(previewIndex > provenanceIndex, 'Netlify preview must follow provenance generation');
assert.ok(previewSmokeIndex > previewIndex, 'preview smoke tests must follow preview deployment');
assert.ok(gateIndex > previewSmokeIndex, 'production gate must wait for preview smoke tests');
assert.ok(deployIndex > gateIndex, 'production gate must execute before Netlify production deploy');
assert.ok(smokeIndex > deployIndex, 'production smoke tests must execute after Netlify deploy');
assert.ok(workflow.includes('inputs.confirm_production == true'), 'production promotion must require explicit manual confirmation');
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /steps\.signing\.outputs\.ready/);
assert.match(workflow, /steps\.signed_apk\.outputs\.published/);
assert.match(workflow, /steps\.netlify\.outputs\.ready/);
assert.match(workflow, /989d3b15-5ba4-42f7-8ba6-b53dc64fbd27/, 'production deploy must target the approved Netlify site ID');
assert.match(workflow, /LittleMinds-Connect-1\.0\.0\.apk/);
assert.match(workflow, /expectedSize = 3024688/);
assert.match(workflow, /65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb/);
assert.match(workflow, /node scripts\/verify-public-release-inputs\.mjs/);
assert.match(workflow, /node scripts\/write-build-provenance\.mjs dist/);
assert.match(workflow, /node scripts\/verify-deployed-provenance\.mjs/);
assert.match(gate, /LMU_ANDROID_KEYSTORE_BASE64/);
assert.match(gate, /NETLIFY_SITE_ID/);
assert.match(gate, /CONNECT_APK_SIZE = 3024688/);
assert.match(gate, /CONNECT_APK_SHA256 = '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb'/);
assert.match(workflow, /verify:play-production -- https:\/\/www\.littlemindsuniverse\.co\.za/);
assert.match(workflow, /\$URL\/api\/health/, 'smoke test must use the configured Netlify /api/health route');
assert.equal((workflow.match(/capacitor\.connect\.config\.json/g) || []).length, 2, 'both PR and main-push path filters must include the Connect Capacitor config');
assert.match(docs, /fails \*\*before production deployment\*\*/);
assert.match(docs, /checksum sidecar but not the APK binary/);

console.log('PASS: public release is gated before deploy on signing, Netlify credentials, and frozen Connect artifact integrity; canonical-domain verification is wired after deploy.');
