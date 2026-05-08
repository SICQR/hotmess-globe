#!/usr/bin/env node
// Generates public/og-image.jpg — 1200x630 share-preview card.
// Run once at build-time or manually: `node scripts/build-og-image.mjs`.
//
// Why an SVG -> sharp pipeline instead of an authored .png:
//   1. Brand colours and copy live alongside the rest of the codebase, so
//      the next typography tweak is a code edit, not a Figma round-trip.
//   2. Sharp is already on disk (it powers other build steps), so this
//      doesn't introduce a new dependency.
//   3. The output is committed (\`public/og-image.jpg\`), so the build
//      pipeline is unaffected — this script only re-runs when someone
//      deliberately re-rasterises.

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'og-image.jpg');

const W = 1200;
const H = 630;
const BG = '#050507';
const GOLD = '#C8962C';
const GOLD_DIM = 'rgba(200, 150, 44, 0.35)';
const TEXT = '#FFFFFF';
const SUBTLE = '#8E8E93';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="${GOLD}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Top hairline -->
  <line x1="80" y1="120" x2="${W - 80}" y2="120" stroke="${GOLD_DIM}" stroke-width="1"/>

  <!-- Eyebrow -->
  <text x="${W / 2}" y="105"
        font-family="'Helvetica Neue', 'Arial Black', Arial, sans-serif"
        font-weight="900" font-size="22" letter-spacing="8"
        fill="${GOLD}" text-anchor="middle">HOTMESS · LDN</text>

  <!-- Wordmark -->
  <text x="${W / 2}" y="340"
        font-family="'Helvetica Neue', 'Arial Black', Arial, sans-serif"
        font-weight="900" font-size="180" letter-spacing="-4"
        fill="${TEXT}" text-anchor="middle">HOTMESS</text>

  <!-- Gold accent under wordmark -->
  <rect x="${W / 2 - 90}" y="370" width="180" height="3" fill="${GOLD}"/>

  <!-- Tagline -->
  <text x="${W / 2}" y="445"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-weight="500" font-size="32" letter-spacing="2"
        fill="${TEXT}" opacity="0.85" text-anchor="middle">Queer-led nightlife, music &amp; care.</text>

  <text x="${W / 2}" y="490"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-weight="500" font-size="22" letter-spacing="6"
        fill="${SUBTLE}" text-anchor="middle">REAL RADIO · REAL VENUES · REAL COMMUNITY</text>

  <!-- Bottom hairline -->
  <line x1="80" y1="${H - 120}" x2="${W - 80}" y2="${H - 120}" stroke="${GOLD_DIM}" stroke-width="1"/>

  <!-- URL -->
  <text x="${W / 2}" y="${H - 60}"
        font-family="'SFMono-Regular', 'Menlo', monospace"
        font-weight="600" font-size="20" letter-spacing="6"
        fill="${GOLD}" text-anchor="middle">HOTMESSLDN.COM</text>
</svg>`;

const buf = await sharp(Buffer.from(svg))
  .jpeg({ quality: 86, mozjpeg: true })
  .toBuffer();

writeFileSync(OUT, buf);
console.log(`Wrote ${OUT} (${buf.length.toLocaleString()} bytes)`);
