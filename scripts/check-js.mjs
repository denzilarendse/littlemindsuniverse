import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const skipDirs = new Set(['node_modules', 'dist', '.git', '.vercel', '.netlify']);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.includes('.before-')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(full);
    } else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(full);
  }
}
walk(root);
let failed = false;
for (const file of files) {
  const run = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (run.status !== 0) {
    failed = true;
    process.stderr.write(run.stderr || run.stdout || `Syntax check failed: ${file}\n`);
  }
}
if (failed) process.exit(1);
console.log(`PASS: syntax checked ${files.length} JavaScript files`);
