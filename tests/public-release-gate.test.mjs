import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const workflow = fs.readFileSync(path.join(root, '.github/workflows/public-release.yml'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs/PUBLIC-RELEASE.md'), 'utf8');
const gate = fs.readFileSync(path.join(root, 'scripts/verify-public-release-inputs.mjs'), 'utf8');
const provenanceWriter = fs.readFileSync(path.join(root, 'scripts/write-build-provenance.mjs'), 'utf8');
const provenanceVerifier = fs.readFileSync(path.join(root, 'scripts/verify-deployed-provenance.mjs'), 'utf8');

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
assert.match(workflow, /persist-credentials: false/);
assert.match(workflow, /github.actor == 'denzilarendse'/, 'release deployment must be owner-controlled');
assert.doesNotMatch(workflow, /--auth=/, 'Netlify credentials must be supplied through the environment, not process arguments');
assert.doesNotMatch(workflow.slice(0, workflow.indexOf('    steps:')), /secrets\./, 'release secrets must not be exposed at job scope');
assert.match(workflow.slice(deployIndex, smokeIndex), /github.event_name == 'workflow_dispatch'/);
assert.doesNotMatch(workflow.slice(previewIndex, gateIndex), /--prod/, 'preview deploy must never use --prod');
assert.match(workflow, /node scripts\/verify-public-release-inputs\.mjs/);
assert.match(workflow, /node scripts\/write-build-provenance\.mjs dist/);
assert.match(workflow, /node scripts\/verify-deployed-provenance\.mjs/);
assert.match(workflow, /verify:play-production -- https:\/\/www\.littlemindsuniverse\.co\.za/);
assert.match(workflow, /\$URL\/api\/health/, 'smoke test must use the configured Netlify /api/health route');

assert.equal((workflow.match(/capacitor\.connect\.config\.json/g) || []).length, 2, 'both PR and main-push path filters must include the Connect Capacitor config');
assert.match(gate, /LMU_ANDROID_KEYSTORE_BASE64/);
assert.match(gate, /NETLIFY_SITE_ID/);
assert.match(gate, /CONNECT_APK_FILENAME = 'LittleMinds-Connect-1\.0\.0\.apk'/);
assert.match(gate, /CONNECT_APK_SIZE = 3024688/);
assert.match(gate, /CONNECT_APK_SHA256 = '65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb'/);
assert.match(gate, /CONNECT_APK_CERT_SHA256 = 'e9bb1e0782aa8b19550e742fe2f59c49a0345afdd65447ce23734c64344525d5'/);
assert.match(gate, /verifyConnectApkSignature/);
assert.match(provenanceWriter, /GITHUB_SHA/);
assert.match(provenanceWriter, /sha256/);
assert.match(provenanceVerifier, /Deployed build provenance SHA does not match/);
assert.match(docs, /draft Netlify preview/);
assert.match(docs, /confirm_production/);
assert.ok(docs.includes('currently contains the sidecar but not the APK binary'));

console.log('PASS: release is preview-first, SHA-bound, and production promotion requires explicit manual confirmation plus fail-closed artifact/signing checks.');
