#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const run = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const repoRoot = (() => {
  try {
    return run('git rev-parse --show-toplevel').trim();
  } catch {
    return process.cwd();
  }
})();

const getStagedFiles = () => {
  // Null-delimited to be safe with spaces.
  const out = run('git diff --cached --name-only -z');
  return out
    .split('\0')
    .map((s) => s.trim())
    .filter(Boolean);
};

const isProbablyBinary = (buf) => {
  const max = Math.min(buf.length, 4096);
  for (let i = 0; i < max; i += 1) {
    if (buf[i] === 0) return true;
  }
  return false;
};

const readStagedBlob = (relPath) => {
  try {
    // Read from the index, not the working tree.
    return run(`git show :${JSON.stringify(relPath)}`);
  } catch {
    // Fall back to disk if needed.
    const fullPath = path.join(repoRoot, relPath);
    return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
  }
};

// Keep patterns focused + low false-positives.
const RULES = [
  {
    name: 'OpenAI API key',
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: 'Shopify admin token',
    regex: /\bshpat_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: 'Shopify storefront token',
    regex: /\b(?:shpca|shpua|shpss)_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: 'Supabase service role key env var',
    regex: /^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*.+$/gim,
  },
  {
    name: 'Supabase JWT secret env var',
    regex: /^\s*SUPABASE_JWT_SECRET\s*=\s*.+$/gim,
  },
  {
    name: 'Postgres connection string',
    regex: /^\s*POSTGRES_(?:PRISMA_)?URL\s*=\s*"?postgres:\/\/.+$/gim,
  },
  {
    name: 'Google API key',
    regex: /\bAIza[0-9A-Za-z\-_]{30,}\b/g,
  },
];

// Files we *never* want committed even if gitignore changes.
const HARD_BLOCK_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
  '.env.development',
  '.env.development.local',
];

const main = () => {
  const stagedFiles = getStagedFiles();
  const findings = [];

  for (const relPath of stagedFiles) {
    const normalized = relPath.replace(/\\/g, '/');

    if (HARD_BLOCK_FILES.includes(normalized)) {
      findings.push({
        file: normalized,
        rule: 'Blocked env file',
        details: `${normalized} is staged (should never be committed)`,
      });
      continue;
    }

    // Skip typical binary paths
    if (/^(?:dist|node_modules|playwright-report|test-results)\//.test(normalized)) continue;

    let text = '';
    try {
      const buf = Buffer.from(readStagedBlob(relPath));
      if (isProbablyBinary(buf)) continue;
      text = buf.toString('utf8');
    } catch {
      continue;
    }

    for (const rule of RULES) {
      if (rule.regex.test(text)) {
        findings.push({ file: normalized, rule: rule.name, details: 'Matched secret pattern' });
      }
      // Reset stateful regexes
      rule.regex.lastIndex = 0;
    }
  }

  if (!findings.length) return;

  const lines = [
    '',
    'Blocked commit: potential secret(s) detected in staged files.',
    'Fix: remove secrets from git history/staging and use env vars instead.',
    '',
    ...findings.map((f) => `- ${f.file}: ${f.rule}`),
    '',
  ];

  // Avoid echoing the secret itself.
  process.stderr.write(lines.join('\n'));
  process.exit(1);
};

main();
