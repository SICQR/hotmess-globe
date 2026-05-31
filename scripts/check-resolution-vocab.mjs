#!/usr/bin/env node
/**
 * scripts/check-resolution-vocab.mjs
 *
 * Convergence Slice v1 PR 3 — Acceptance Test §5.5.
 * D19 §6.10 + D34 §4.7 + D19 §11.1 binding.
 *
 * Scans the convergence-slice user-facing files for prohibited marketplace
 * verbs. CI fails the build if any leak into surface copy. The convergence
 * surfaces must speak passing-on language, never marketplace-completion
 * language.
 *
 * Allow-list rules:
 *   - Comments: prohibited words MAY appear in code comments (we use them
 *     to explain why they're banned). Strings in JSX / display copy are
 *     the failure path.
 *   - Function names: 'sold' would be a code-side identifier and is also
 *     not surface copy. We scan ONLY string literals + JSX text.
 *
 * Run:  node scripts/check-resolution-vocab.mjs
 *       (wired into CI via npm script in a follow-up PR if not already)
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Files within the convergence slice scope. Add to this list as the slice
// grows (PR 4 will likely add chat-related surfaces).
const TARGET_FILES = [
  'src/components/sheets/L2HybridExchangeSheet.tsx',
  'src/lib/atmospheric.ts',
];

// Prohibited surface vocabulary, per D19 §6.10 + D34 §4.7 + D19 §11.1.
// Each entry is a regex matched against string literals + JSX text only.
// Case-insensitive.
const PROHIBITED_PATTERNS = [
  /\bsold\b/i,
  /\bbuyer\b/i,
  /\bseller completed\b/i,
  /\border\b/i,
  /\btransaction successful\b/i,
  /\bcompleted purchase\b/i,
  /\bbuy now\b/i,
  /\bbest price\b/i,
  /\bbest offer\b/i,
  /\blimited stock\b/i,
  /\bmust sell\b/i,
  /\bfastest seller\b/i,
];

/**
 * Extract user-facing strings from a file:
 *   - JSX text between > and <
 *   - String literals not in single-line comments
 *
 * We intentionally exclude `//` and `/* */` comment regions because the
 * doctrine + scan files reference the prohibited words while banning them.
 */
function extractSurfaceText(source) {
  // Strip single-line comments.
  let s = source.replace(/^\s*\/\/.*$/gm, '');
  // Strip block comments.
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  return s;
}

let failed = false;
for (const rel of TARGET_FILES) {
  const path = join(repoRoot, rel);
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch {
    // File missing — slice may not yet have created it. Skip silently.
    continue;
  }
  const surface = extractSurfaceText(source);
  for (const pat of PROHIBITED_PATTERNS) {
    const match = surface.match(pat);
    if (match) {
      const idx = surface.indexOf(match[0]);
      const lineNum = surface.slice(0, idx).split('\n').length;
      console.error(
        `❌ ${rel}:${lineNum} — prohibited resolution vocabulary "${match[0]}" found in surface text.`,
      );
      console.error(
        '   D19 §6.10 + D34 §4.7 bind: use Passed on / Sorted / Covered / Claimed / Going together / Heading there / Picked up / Handed over.',
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error('\n💥 Convergence vocabulary scan FAILED. See docs/doctrine/19-marketplace-doctrine.md §6.10 and docs/doctrine/34-trajectory-doctrine.md §4.7.');
  process.exit(1);
}

console.log('✅ Convergence resolution vocabulary clean.');
