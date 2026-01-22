#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const hooksPath = path.join(repoRoot, '.githooks');
const preCommit = path.join(hooksPath, 'pre-commit');

if (!fs.existsSync(preCommit)) {
  console.error('Missing .githooks/pre-commit');
  process.exit(1);
}

// Ensure executable bit (best-effort).
try {
  fs.chmodSync(preCommit, 0o755);
} catch {
  // ignore
}

run(`git config core.hooksPath ${JSON.stringify('.githooks')}`);
console.log('Git hooks installed: core.hooksPath=.githooks');
