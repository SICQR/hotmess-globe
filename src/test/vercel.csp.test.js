import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readVercelJson = () => {
  const filePath = path.resolve(process.cwd(), 'vercel.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const getCspHeaderValue = (vercelJson) => {
  // Check routes for headers (can be array or object format)
  const fromRoutes = Array.isArray(vercelJson?.routes) ? vercelJson.routes : [];
  for (const route of fromRoutes) {
    if (!route?.headers) continue;
    
    // Object format: { "Content-Security-Policy": "..." }
    if (typeof route.headers === 'object' && !Array.isArray(route.headers)) {
      const csp = route.headers['Content-Security-Policy'];
      if (csp) return String(csp);
    }
    
    // Array format: [{ key: "Content-Security-Policy", value: "..." }]
    if (Array.isArray(route.headers)) {
      const found = route.headers.find((h) => h?.key === 'Content-Security-Policy');
      if (found?.value) return String(found.value);
    }
  }

  // Legacy/alternative config: top-level `headers` array
  const fromHeaders = Array.isArray(vercelJson?.headers) ? vercelJson.headers : [];
  for (const rule of fromHeaders) {
    const ruleHeaders = Array.isArray(rule?.headers) ? rule.headers : [];
    const found = ruleHeaders.find((h) => h?.key === 'Content-Security-Policy');
    if (found?.value) return String(found.value);
  }
  
  return null;
};

describe('vercel.json CSP', () => {
  it('is present and well-formed enough to be actionable', () => {
    const vercelJson = readVercelJson();
    const csp = getCspHeaderValue(vercelJson);

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('script-src');
    expect(csp).toContain('connect-src');
    expect(csp).toContain('frame-src');

    // Common accidental breakages when editing long CSP strings.
    expect(csp).not.toContain(';;');
    expect(csp).not.toContain('\n');
  });

  it('allows Vercel Live feedback script', () => {
    const vercelJson = readVercelJson();
    const csp = getCspHeaderValue(vercelJson);

    expect(csp).toBeTruthy();
    expect(csp).toContain('https://vercel.live');

    // Make script element policy explicit so browsers don't fall back to script-src.
    expect(csp).toContain('script-src-elem');
    expect(csp).toContain("script-src-elem 'self'");
  });

  it('allows Vercel Live websocket connections (when enabled)', () => {
    const vercelJson = readVercelJson();
    const csp = getCspHeaderValue(vercelJson);

    expect(csp).toBeTruthy();
    expect(csp).toContain('connect-src');
    expect(csp).toContain('wss://vercel.live');
  });
});
