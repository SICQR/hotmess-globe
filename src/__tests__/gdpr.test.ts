/**
 * gdpr.test.ts
 * Scans JSX/TSX files for email string rendering patterns that could
 * leak PII to the UI. Fails if any pattern like `|| email`, `|| user.email`,
 * or `{email}` / `{user.email}` is found inside JSX return blocks.
 *
 * This is a static analysis guard — not a runtime test.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const SRC_ROOT = resolve(__dirname, '..');

/** Recursively collect files matching extensions */
function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
        results.push(...collectFiles(full, exts));
      } else if (exts.some((ext) => full.endsWith(ext))) {
        results.push(full);
      }
    } catch {
      continue;
    }
  }
  return results;
}

/**
 * Patterns that indicate email values RENDERED AS VISIBLE TEXT in JSX.
 * We only flag patterns where an email would appear in the DOM as user-visible text.
 * Programmatic usage (React keys, query params, Supabase filters, function args) is OK.
 */
const DANGEROUS_PATTERNS = [
  // Fallback text: {name || email} or {name || user.email} — renders email when name is missing
  /\{\s*\w+(?:\.\w+)?\s*\|\|\s*(?:\w+\.)?email\s*\}/,
  // Direct email interpolation in visible text: >{email}< or >{user.email}<
  />\s*\{(?:\w+\.)?email\}\s*</,
  // Template literal with email in JSX text content: {`...${user.email}...`}
  /\{\s*`[^`]*\$\{(?:\w+\.)?email\}[^`]*`\s*\}/,
  // Explicit display: <span>{email}</span> or similar text-rendering elements
  /<(?:span|p|div|h[1-6]|label|td|li|strong|em|b)[^>]*>\s*\{(?:\w+\.)?email\}/,
];

/** Files/paths to exclude from scanning */
const EXCLUSIONS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /Auth\.jsx/,           // Auth screens legitimately show email inputs
  /SignUpScreen/,        // Sign-up legitimately references email
  /MagicLinkConfirm/,   // Confirmation screen shows "check your email" (not the address)
  /supabaseClient/,     // Client config, not UI
  /pushNotify/,         // Backend helper, not UI rendering
  /Settings\.jsx/,      // Account settings — user's own email in disabled input (acceptable)
  /SquadChat\.jsx/,     // Legacy file — email used as key/route param (TODO: migrate to user ID)
  /examples\//,         // Example/reference code, not production UI
  /ForgotPassword/,     // Password reset confirmation — shows masked email (acceptable UX pattern)
];

function isExcluded(filePath: string): boolean {
  return EXCLUSIONS.some((pattern) => pattern.test(filePath));
}

describe('GDPR — no email PII leaks in JSX rendering', () => {
  const jsxFiles = collectFiles(SRC_ROOT, ['.jsx', '.tsx']);

  it('found JSX/TSX source files to scan', () => {
    expect(jsxFiles.length).toBeGreaterThan(0);
  });

  it('no JSX files render raw email addresses in the UI', () => {
    const violations: string[] = [];

    for (const filePath of jsxFiles) {
      if (isExcluded(filePath)) continue;

      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip TypeScript type/interface definitions
        if (/^\s*(export\s+)?(interface|type)\s/.test(line)) continue;
        // Skip import lines
        if (/^\s*import\s/.test(line)) continue;
        // Skip comments
        if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
        // Skip console/logging lines
        if (/console\.(log|warn|error|info)/.test(line)) continue;
        // Skip variable assignments
        if (/^\s*(?:const|let|var)\s/.test(line)) continue;
        // Skip Supabase query chains (.eq, .or, .select, .insert, .from)
        if (/\.\s*(?:eq|or|select|insert|update|from|channel)\s*\(/.test(line)) continue;
        // Skip function calls that pass email as argument (not rendering)
        if (/(?:mutate|fetch|push|set|toggle|check|create|assign)\s*\(/.test(line)) continue;
        // Skip React key props
        if (/key=\{/.test(line)) continue;
        // Skip href/to/Link routing props
        if (/(?:to|href|Link)\s*[={]/.test(line)) continue;
        // Skip onClick and event handlers
        if (/on[A-Z]\w*=\{/.test(line)) continue;
        // Skip object property assignments
        if (/^\s*\w+\s*:/.test(line)) continue;

        for (const pattern of DANGEROUS_PATTERNS) {
          if (pattern.test(line)) {
            const relative = filePath.replace(SRC_ROOT + '/', '');
            violations.push(`${relative}:${i + 1} — ${line.trim()}`);
            break;
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations.map((v) => `  - ${v}`).join('\n');
      expect.fail(
        `Found ${violations.length} potential email PII leak(s) in JSX:\n${report}\n\n` +
          'Emails must never be rendered in the UI (GDPR). ' +
          'Use display_name or a masked value instead.',
      );
    }
  });
});
