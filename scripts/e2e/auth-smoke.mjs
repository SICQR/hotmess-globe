import { spawn } from 'node:child_process';
import process from 'node:process';

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
  const shouldSeed = String(process.env.E2E_SEED || 'true').toLowerCase() !== 'false';
  const lat = parseNumber(process.env.E2E_SEED_LAT, 51.5074);
  const lng = parseNumber(process.env.E2E_SEED_LNG, -0.1278);
  const count = parseNumber(process.env.E2E_SEED_COUNT, 12);
  const spread = parseNumber(process.env.E2E_SEED_SPREAD_M, 3000);

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
    ], { allowFailure: true });
  } else if (shouldSeed) {
    // eslint-disable-next-line no-console
    console.log('[e2e] Skipping profile seeding (missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).');
  }

  // Run only the authenticated social connection spec.
  await run('npm', ['run', 'test:e2e', '--', 'e2e/smoke.c.auth-social-connect.spec.ts']);
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[e2e] Failed:', err?.message || String(err));
  process.exit(1);
});
