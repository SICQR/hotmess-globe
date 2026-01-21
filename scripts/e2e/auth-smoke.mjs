import { spawn } from 'node:child_process';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const loadEnvFiles = () => {
  const cwd = process.cwd();
  const mode = String(process.env.NODE_ENV || '').trim() || 'development';

  const candidates = [
    '.env',
    '.env.local',
    `.env.${mode}`,
    `.env.${mode}.local`,
  ];

  const applyParsed = (parsed, { overrideExisting }) => {
    if (!parsed || typeof parsed !== 'object') return;
    for (const [key, value] of Object.entries(parsed)) {
      if (!key) continue;
      const hasExisting = Object.prototype.hasOwnProperty.call(process.env, key);
      if (hasExisting && !overrideExisting) continue;
      process.env[key] = String(value);
    }
  };

  // Mirror Vite precedence while avoiding clobbering real exported env vars.
  // - .env provides defaults
  // - .env.local overrides .env
  // - mode-specific files override both
  for (const filename of candidates) {
    const fullPath = path.resolve(cwd, filename);
    if (!fs.existsSync(fullPath)) continue;

    let raw = '';
    try {
      raw = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const parsed = dotenv.parse(raw);
    const overrideExisting = filename !== '.env';
    applyParsed(parsed, { overrideExisting });
  }
};

loadEnvFiles();

const run = (cmd, args, { allowFailure = false } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 || allowFailure) return resolve(code ?? 0);
      const err = new Error(`${cmd} ${args.join(' ')} failed with exit code ${code}`);
      err.exitCode = code;
      reject(err);
    });
  });

const hasSupabaseSeedEnv = () => {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const service = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return Boolean(url && service);
};

const parseNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const main = async () => {
  const strict =
    String(process.env.E2E_STRICT || '').toLowerCase() === 'true' ||
    String(process.env.CI || '').toLowerCase() === 'true';

  const shouldSeed = String(process.env.E2E_SEED || 'true').toLowerCase() !== 'false';
  const lat = parseNumber(process.env.E2E_SEED_LAT, 51.5074);
  const lng = parseNumber(process.env.E2E_SEED_LNG, -0.1278);
  const count = parseNumber(process.env.E2E_SEED_COUNT, 12);
  const spread = parseNumber(process.env.E2E_SEED_SPREAD_M, 3000);

  const hasE2ECreds = Boolean(String(process.env.E2E_EMAIL || '').trim() && String(process.env.E2E_PASSWORD || '').trim());

  if (hasE2ECreds && hasSupabaseSeedEnv()) {
    await run('node', ['scripts/e2e/ensure-e2e-user.mjs']);
  } else if (hasE2ECreds) {
    const msg = '[e2e] Skipping ensure-e2e-user (missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).';
    if (strict) throw new Error(`${msg} Set env or disable strict mode.`);
    console.log(msg);
  }

  if (shouldSeed && hasSupabaseSeedEnv()) {
    await run('npm', [
      'run',
      'seed:mock-profiles',
      '--',
      '--lat',
      String(lat),
      '--lng',
      String(lng),
      '--count',
      String(count),
      '--spread_m',
      String(spread),
    ], { allowFailure: !strict });
  } else if (shouldSeed) {
    const msg = '[e2e] Skipping profile seeding (missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).';
    if (strict) throw new Error(`${msg} Set env or disable strict mode.`);
    console.log(msg);
  }

  // Run only the authenticated social connection spec.
  await run('npm', ['run', 'test:e2e', '--', 'e2e/smoke.c.auth-social-connect.spec.ts']);
};

main().catch((err) => {
  console.error('[e2e] Failed:', err?.message || String(err));
  process.exit(1);
});
