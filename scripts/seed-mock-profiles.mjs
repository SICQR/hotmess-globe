import { createClient } from '@supabase/supabase-js';

const requireEnv = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const rand = (min, max) => Math.random() * (max - min) + min;

const makeUuidV4 = () => {
  // Non-crypto UUID v4; fine for mock dev data.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const slugify = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = args[i + 1];
    if (!val || val.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = val;
    i += 1;
  }
  return out;
};

const main = async () => {
  const argv = parseArgs();

  const lat = Number(argv.lat);
  const lng = Number(argv.lng);
  const count = Number(argv.count || 12);
  const spreadMeters = Number(argv.spread_m || 3000);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Usage: npm run seed:mock-profiles -- --lat <lat> --lng <lng> [--count 12] [--spread_m 3000]');
  }

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const metersToLat = (m) => m / 111_320;
  const metersToLng = (m, atLat) => m / (111_320 * Math.cos((atLat * Math.PI) / 180));

  const nowIso = new Date().toISOString();

  const names = [
    'Roxy Voltage',
    'Milo Afterhours',
    'Jade Neon',
    'Kris Kensington',
    'Nova Hotwire',
    'Skyline Sage',
    'Vanta Rose',
    'Lexi LDN',
    'Harper Bassline',
    'Saffron Static',
    'Demi Nightbus',
    'Rio Rush',
    'Echo Velvet',
    'Tess Terminal',
  ];

  const rows = Array.from({ length: count }).map((_, i) => {
    const fullName = names[i % names.length];
    const email = `mock.${slugify(fullName)}.${i + 1}@hotmess.local`;

    const dNorth = rand(-spreadMeters, spreadMeters);
    const dEast = rand(-spreadMeters, spreadMeters);

    const last_lat = lat + metersToLat(dNorth);
    const last_lng = lng + metersToLng(dEast, lat);

    return {
      email,
      auth_user_id: makeUuidV4(),
      full_name: fullName,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=400&background=FF1493&color=000`,
      xp: Math.floor(rand(250, 12000)),
      subscription_tier: i % 3 === 0 ? 'PAID' : 'FREE',
      default_travel_mode: i % 2 === 0 ? 'WALK' : 'TRANSIT',
      privacy_hide_proximity: false,
      is_online: true,
      last_lat,
      last_lng,
      last_loc_ts: nowIso,
      loc_accuracy_m: 25,
      // legacy columns for older UI paths
      lat: last_lat,
      lng: last_lng,
      created_date: nowIso,
      updated_date: nowIso,
    };
  });

  const stripUnknownColumnAndRetry = async (inputRows) => {
    let attemptRows = inputRows;
    const removed = new Set();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const { data, error } = await supabase
        .from('User')
        .upsert(attemptRows, { onConflict: 'email' })
        .select('email');

      if (!error) return { data, removed: Array.from(removed) };

      const msg = String(error?.message || '');
      const m = msg.match(/Could not find the '([^']+)' column of 'User'/i);
      if (!m) throw error;

      const missingCol = m[1];
      removed.add(missingCol);
      attemptRows = attemptRows.map((r) => {
        const next = { ...r };
        delete next[missingCol];
        return next;
      });
    }

    throw new Error('Failed to seed after many retries removing unknown columns');
  };

  const { data, removed } = await stripUnknownColumnAndRetry(rows);

  console.log(
    JSON.stringify(
      {
        ok: true,
        inserted_or_updated: Array.isArray(data) ? data.length : 0,
        removed_columns: removed,
        note: 'Mock profiles created in public."User". Open Globe → Nearby People to see them.',
      },
      null,
      2
    )
  );
};

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }, null, 2));
  process.exit(1);
});
