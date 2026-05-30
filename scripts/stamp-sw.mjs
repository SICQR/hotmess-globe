#!/usr/bin/env node
// Postbuild: stamp a unique build id into the emitted service worker so it changes
// every deploy. Browsers only update a SW when /sw.js bytes change; a static
// CACHE_VERSION meant deploys never purged the cache (stale app shell). This makes
// sw.js byte-unique per build → the SW re-activates → activate() purges old caches.
// Tolerant: never throws, never fails the build (exit 0 even if no target found).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TOKEN = '__SW_BUILD_ID__';
const id = 'b' + Date.now();
const targets = ['dist/sw.js', 'dist2/sw.js', 'build/sw.js'];
let stamped = false;
for (const f of targets) {
  try {
    if (!existsSync(f)) continue;
    const src = readFileSync(f, 'utf8');
    if (!src.includes(TOKEN)) continue;
    writeFileSync(f, src.split(TOKEN).join(id));
    console.log(`[stamp-sw] ${f}: CACHE_VERSION -> v7-${id}`);
    stamped = true;
  } catch (e) {
    console.warn('[stamp-sw] skip', f, e?.message);
  }
}
if (!stamped) console.warn('[stamp-sw] no sw.js with token found — build OK, cache id stays v7-' + TOKEN);
process.exit(0);
