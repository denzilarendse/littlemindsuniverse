import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const workflow = fs.readFileSync(path.join(root, '.github/workflows/public-release.yml'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs/PUBLIC-RELEASE.md'), 'utf8');

const gateIndex = workflow.indexOf('Enforce production release gate before deploy');
const deployIndex = workflow.indexOf('Deploy production web app to Netlify');
const smokeIndex = workflow.indexOf('Smoke-test Netlify production deploy');

assert.ok(gateIndex >= 0, 'production gate must exist');
assert.ok(deployIndex > gateIndex, 'production gate must execute before Netlify deploy');
assert.ok(smokeIndex > deployIndex, 'production smoke tests must execute after Netlify deploy');
assert.match(workflow, /steps\.signing\.outputs\.ready/);
assert.match(workflow, /steps\.signed_apk\.outputs\.published/);
assert.match(workflow, /steps\.netlify\.outputs\.ready/);
assert.match(workflow, /989d3b15-5ba4-42f7-8ba6-b53dc64fbd27/, 'production deploy must target the approved Netlify site ID');
assert.match(workflow, /LittleMinds-Connect-1\.0\.0\.apk/);
assert.match(workflow, /expectedSize = 3024688/);
assert.match(workflow, /65c8ae9335304601fe2098684e08dfe9bfcca7cebdb11fbc9de093d9e73412cb/);
assert.match(workflow, /verify:play-production -- https:\/\/www\.littlemindsuniverse\.co\.za/);
assert.match(docs, /fails \*\*before production deployment\*\*/);
assert.match(docs, /checksum sidecar but not the APK binary/);

console.log('PASS: public release is gated before deploy on signing, Netlify credentials, and frozen Connect artifact integrity; canonical-domain verification is wired after deploy.');
