import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

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

const stableUuid = (key) => {
  const hex = crypto.createHash('md5').update(String(key)).digest('hex');
  // Format a UUID-like string (not cryptographically secure; only for deterministic mock IDs).
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
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

    // Male-only photo pool (seeded mocks only). These are public Unsplash images.
    // Keep these URLs stable so seeded profiles look consistent across runs.
    const photoPool = [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520975693411-6c5fe1e26f0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520975958221-0a3f65a2b9f5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520974735194-6a9a3a559b97?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520962917960-20a70b7f212a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    ];

    const pickPhotos = (seed) => {
      const start = Math.abs(Number(seed || 0)) % photoPool.length;
      const out = [];
      for (let j = 0; j < 5; j += 1) {
        const url = photoPool[(start + j) % photoPool.length];
        out.push({ url, isPrimary: j === 0 });
      }
      return out;
    };

    const randomPassword = () => `mock-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;

    const findAuthUserByEmail = async (email) => {
      // Admin API doesn't provide a direct getByEmail; list + scan is ok for dev seed sizes.
      const target = String(email || '').trim().toLowerCase();
      if (!target) return null;

      for (let page = 1; page <= 10; page += 1) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return null;
        const users = Array.isArray(data?.users) ? data.users : [];
        const match = users.find((u) => String(u?.email || '').trim().toLowerCase() === target);
        if (match) return match;
        if (users.length < 200) break;
      }
      return null;
    };

    const ensureAuthUser = async ({ email, fullName, userMetadata }) => {
      const create = await supabase.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          ...(userMetadata || {}),
        },
      });

      if (!create?.error && create?.data?.user) {
        return create.data.user;
      }

      const msg = String(create?.error?.message || '').toLowerCase();
      const alreadyExists = msg.includes('already') || msg.includes('exists') || msg.includes('registered');
      if (!alreadyExists) {
        throw create.error;
      }

      const existing = await findAuthUserByEmail(email);
      if (!existing?.id) {
        throw create.error;
      }

      // Ensure metadata is updated to our latest seed.
      await supabase.auth.admin.updateUserById(existing.id, {
        user_metadata: {
          ...(existing.user_metadata || {}),
          full_name: fullName,
          ...(userMetadata || {}),
        },
      });

      const refreshed = await supabase.auth.admin.getUserById(existing.id);
      return refreshed?.data?.user || existing;
    };

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

    const profileType = i % 4 === 0 ? 'seller' : 'creator';
    const photos = pickPhotos(i);
    const avatarUrl = photos[0]?.url;

    const dNorth = rand(-spreadMeters, spreadMeters);
    const dEast = rand(-spreadMeters, spreadMeters);

    const last_lat = lat + metersToLat(dNorth);
    const last_lng = lng + metersToLng(dEast, lat);

    return {
      email,
      // Will be replaced with a real auth user id after we seed auth.users.
      auth_user_id: makeUuidV4(),
      full_name: fullName,
      avatar_url: avatarUrl,
      photos,
      profile_type: profileType,
      bio: profileType === 'seller' ? 'Late-night walks, loud music, no drama' : 'Gym rat, beach lover',
      photo_policy_ack: true,
      gender: 'male',
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

  // Seed Supabase Auth users so list_profiles_secure (RPC) can pull `photos` from auth metadata.
  // This is what makes /api/profiles and /connect fully consistent end-to-end.
  const authIdByEmail = new Map();
  for (const row of rows) {
    const email = row.email;
    const fullName = row.full_name;
    const profileType = row.profile_type;

    const meta = {
      photos: Array.isArray(row.photos) ? row.photos : [],
      photo_policy_ack: true,
      gender: 'male',
      profile_type: profileType,
      ...(profileType === 'seller'
        ? {
            seller_tagline: 'Clubwear drops + limited runs',
            seller_bio: 'Limited runs. London-made. DM to collab.',
          }
        : {}),
    };

    const authUser = await ensureAuthUser({ email, fullName, userMetadata: meta });
    authIdByEmail.set(String(email).toLowerCase(), authUser?.id ? String(authUser.id) : row.auth_user_id);
  }

  const rowsWithAuth = rows.map((r) => {
    const authUserId = authIdByEmail.get(String(r.email).toLowerCase()) || r.auth_user_id;
    return { ...r, auth_user_id: authUserId };
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

  const { data, removed } = await stripUnknownColumnAndRetry(rowsWithAuth);

  // Seed a few active products for mock sellers so seller cards can show real product thumbnails.
  // This is best-effort; if the products table schema differs, we skip without failing the seed.
  try {
    const sellerRows = rowsWithAuth.filter((r) => String(r?.profile_type || '').trim().toLowerCase() === 'seller');
    const productRows = [];

    for (let i = 0; i < sellerRows.length; i += 1) {
      const seller = sellerRows[i];
      const sellerEmail = String(seller?.email || '').trim().toLowerCase();
      if (!sellerEmail) continue;

      const sellerName = String(seller?.full_name || sellerEmail).trim();

      for (let j = 0; j < 2; j += 1) {
        const imageUrl = photoPool[(i + j) % photoPool.length];
        const id = stableUuid(`mock-product:${sellerEmail}:${j}`);

        productRows.push({
          id,
          seller_email: sellerEmail,
          name: `Drop ${j + 1} — ${sellerName}`,
          description: 'Limited. Unapologetic. Gone fast.',
          price_xp: 900 + j * 250,
          price_gbp: 15 + j * 5,
          product_type: 'merch',
          category: 'Drops',
          tags: ['mock', 'drop', 'limited'],
          image_urls: imageUrl ? [imageUrl] : [],
          status: 'active',
          inventory_count: 20,
          details: { source: 'mock-seed', seller_profile_email: sellerEmail },
          created_at: nowIso,
          updated_at: nowIso,
          created_date: nowIso,
          updated_date: nowIso,
          created_by: sellerEmail,
        });
      }
    }

    if (productRows.length) {
      await supabase.from('products').upsert(productRows, { onConflict: 'id' });
    }
  } catch {
    // ignore
  }

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
