import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

function collectFiles(root, current = root, result = {}) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) collectFiles(root, absolute, result);
    else if (entry.isFile() && entry.name !== 'build-info.json') {
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      const bytes = fs.readFileSync(absolute);
      result[relative] = {
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex')
      };
    }
  }
  return result;
}

export function createBuildProvenance({ distDir, env, generatedAt = new Date().toISOString() }) {
  if (!env?.GITHUB_SHA || !/^[a-f0-9]{40}$/i.test(env.GITHUB_SHA)) {
    throw new Error('GITHUB_SHA must be a full 40-character commit SHA.');
  }
  if (!env.GITHUB_REPOSITORY) throw new Error('GITHUB_REPOSITORY is required.');
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
    throw new Error('The production dist directory does not exist.');
  }
  const files = collectFiles(distDir);
  if (!files['index.html'] || !files['connect.html']) {
    throw new Error('The deployable bundle is missing index.html or connect.html.');
  }
  return {
    schemaVersion: 1,
    generatedAt,
    source: {
      repository: env.GITHUB_REPOSITORY,
      ref: env.GITHUB_REF || null,
      sha: env.GITHUB_SHA.toLowerCase(),
      workflowRunId: env.GITHUB_RUN_ID || null,
      workflowRunAttempt: env.GITHUB_RUN_ATTEMPT || null
    },
    artifacts: { algorithm: 'sha256', files }
  };
}

export function writeBuildProvenance({ distDir, env = process.env, generatedAt } = {}) {
  const provenance = createBuildProvenance({ distDir, env, generatedAt });
  fs.writeFileSync(path.join(distDir, 'build-info.json'), `${JSON.stringify(provenance, null, 2)}\n`, { mode: 0o644 });
  return provenance;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const distDir = path.resolve(process.argv[2] || 'dist');
    const result = writeBuildProvenance({ distDir });
    console.log(`Build provenance written for ${result.source.sha} (${Object.keys(result.artifacts.files).length} files).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
