#!/usr/bin/env node
/**
 * check-canonical-globe-layer-stack.mjs
 *
 * Guardrail (Phil locked 2026-05-29).
 *
 * The mapbox globe layer stack lives at exactly one canonical path:
 *
 *     src/lib/globe/mapboxLayerStack.js
 *
 * PulseMap.jsx imports it via `'../../lib/globe/mapboxLayerStack'`. Any twin
 * file with the same basename — most easily created by sloppy refactors or
 * AI-driven edits that copy the file into a subfolder — is dead code that
 * silently steals patches and ships nothing.
 *
 * This script runs as part of `npm run build`. It fails the build if:
 *
 *   - The canonical file is missing.
 *   - The known-bad orphan `src/lib/globe/mapbox/mapboxLayerStack.js` exists.
 *   - Any other file named `mapboxLayerStack.*` exists anywhere under `src/`.
 *
 * History — this trap cost three real patches:
 *   - #179: wrong beacon-drop component patched
 *   - #305: same trap (BeaconDropModal vs L2BeaconSheet BeaconCreator)
 *   - #314: #668 patched the orphan twin of this very layer stack
 *
 * If this script fires, fix the import drift before merging. Do NOT
 * silence the script.
 */

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

const CANONICAL = 'src/lib/globe/mapboxLayerStack.js';
const KNOWN_ORPHAN = 'src/lib/globe/mapbox/mapboxLayerStack.js';

const ERRORS = [];

// 1. Canonical must exist.
if (!existsSync(join(REPO_ROOT, CANONICAL))) {
  ERRORS.push(`Canonical layer stack missing: ${CANONICAL}`);
}

// 2. Known orphan must NOT exist.
if (existsSync(join(REPO_ROOT, KNOWN_ORPHAN))) {
  ERRORS.push(
    `Known orphan exists: ${KNOWN_ORPHAN}\n` +
    `  → This file is not imported by anything. PulseMap.jsx imports ${CANONICAL}.\n` +
    `  → Delete the orphan before merging. See docs/operations/release-checklist.md.`
  );
}

// 3. No other file anywhere in src/ may share the basename.
function* walkSrc(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip node_modules and build outputs if they ever sneak in.
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
      yield* walkSrc(full);
    } else {
      yield full;
    }
  }
}

const SRC_DIR = join(REPO_ROOT, 'src');
const found = [];
if (existsSync(SRC_DIR)) {
  for (const file of walkSrc(SRC_DIR)) {
    const base = file.split('/').pop() || '';
    if (/^mapboxLayerStack\.(m?[jt]sx?)$/.test(base)) {
      found.push(relative(REPO_ROOT, file));
    }
  }
}

const unexpected = found.filter((p) => p !== CANONICAL);
if (unexpected.length > 0) {
  ERRORS.push(
    `Unexpected mapboxLayerStack file(s) under src/:\n` +
    unexpected.map((p) => `  - ${p}`).join('\n') +
    `\n  → Only the canonical path ${CANONICAL} may exist.`
  );
}

if (ERRORS.length > 0) {
  console.error('\n✗ check-canonical-globe-layer-stack failed:\n');
  for (const e of ERRORS) {
    console.error('  ' + e + '\n');
  }
  console.error('  Phil 2026-05-29: the duplicate-file trap has cost three real');
  console.error('  patches (#179, #305, #314). Resolve the drift before merging.\n');
  process.exit(1);
}

console.log('✓ globe layer stack is canonical at ' + CANONICAL);
