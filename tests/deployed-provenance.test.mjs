import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBuildProvenance } from '../scripts/write-build-provenance.mjs';
import { verifyDeployedProvenance } from '../scripts/verify-deployed-provenance.mjs';

const sha = '91289ae8796af660c287a8f94936c94b383b9879';
const env = {
  GITHUB_SHA: sha,
  GITHUB_REPOSITORY: 'denzilarendse/littlemindsuniverse',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_RUN_ID: '12345',
  GITHUB_RUN_ATTEMPT: '1'
};

function fixture() {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lmu-provenance-'));
  fs.writeFileSync(path.join(distDir, 'index.html'), '<h1>LMU</h1>');
  fs.writeFileSync(path.join(distDir, 'connect.html'), '<h1>Connect</h1>');
  return distDir;
}

function mockResponse(url, bytes, json = false) {
  return {
    url,
    status: 200,
    async json() { return JSON.parse(bytes.toString('utf8')); },
    async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
  };
}

test('build provenance binds source SHA and static artifact hashes', () => {
  const distDir = fixture();
  const info = createBuildProvenance({ distDir, env, generatedAt: '2026-11-03T00:00:00.000Z' });
  assert.equal(info.source.sha, sha);
  assert.equal(info.source.repository, env.GITHUB_REPOSITORY);
  assert.equal(info.artifacts.files['index.html'].size, Buffer.byteLength('<h1>LMU</h1>'));
  assert.match(info.artifacts.files['index.html'].sha256, /^[a-f0-9]{64}$/);
  assert.ok(info.artifacts.files['connect.html']);
});

test('deployed provenance verifies SHA and critical static file hashes', async () => {
  const distDir = fixture();
  const info = createBuildProvenance({ distDir, env });
  const files = {
    '/build-info.json': Buffer.from(JSON.stringify(info)),
    '/index.html': fs.readFileSync(path.join(distDir, 'index.html')),
    '/connect.html': fs.readFileSync(path.join(distDir, 'connect.html'))
  };
  const fetchImpl = async input => {
    const url = new URL(String(input));
    const bytes = files[url.pathname];
    return bytes ? mockResponse(url.href, bytes) : mockResponse(url.href, Buffer.from('missing'));
  };
  const result = await verifyDeployedProvenance('https://preview.example.net', {
    expectedSha: sha,
    expectedRepository: env.GITHUB_REPOSITORY,
    fetchImpl
  });
  assert.equal(result.sourceSha, sha);
  assert.deepEqual(result.verifiedFiles, ['index.html', 'connect.html']);
});

test('deployed provenance rejects a mismatched source SHA', async () => {
  const distDir = fixture();
  const info = createBuildProvenance({ distDir, env: { ...env, GITHUB_SHA: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } });
  const fetchImpl = async input => {
    const url = new URL(String(input));
    return mockResponse(url.href, Buffer.from(JSON.stringify(info)));
  };
  await assert.rejects(
    verifyDeployedProvenance('https://preview.example.net', { expectedSha: sha, fetchImpl }),
    /does not match the workflow source SHA/
  );
});
