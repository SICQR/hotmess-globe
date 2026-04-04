import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, getQueryParam, json } from './shopify/_utils.js';
import { getSupabaseServerClients } from './routing/_utils.js';

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
};

const normalizeGender = (value) => String(value || '').trim().toLowerCase();

const isFemaleGender = (value) => {
  const g = normalizeGender(value);
  return g === 'f' || g.includes('female') || g.includes('woman');
};

const getPhotoPolicyAck = ({ row, meta }) => {
  const candidates = [
    row?.photo_policy_ack,
    row?.photoPolicyAck,
    meta?.photo_policy_ack,
    meta?.photoPolicyAck,
  ];
  for (const v of candidates) {
    if (v === true) return true;
    if (v === false) return false;
  }
  return null;
};

const getGenderValue = ({ row, meta }) => {
  return row?.gender ?? meta?.gender ?? row?.sex ?? meta?.sex ?? null;
};

// No fallback demo profiles - return empty if DB unavailable
const buildFallbackProfiles = () => [];

const dedupeItems = (items) => {
  const list = Array.isArray(items) ? items : [];
  const seen = new Set();
  const out = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const rawId = item.id;
    const key = rawId ? String(rawId).trim().toLowerCase() : '';
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
};

const toShortHeadline = (bio, fallback) => {
  const text = String(bio || '').trim();
  if (!text) return fallback;
  const oneLine = text.replace(/\s+/g, ' ');
  return oneLine.length > 80 ? `${oneLine.slice(0, 77)}…` : oneLine;
};

const buildTagMap = (rows) => {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const email = String(r?.user_email || '').trim().toLowerCase();
    const tag = String(r?.tag_id || '').trim();
    if (!email || !tag) return;
    if (!map.has(email)) map.set(email, []);
    const arr = map.get(email);
    if (Array.isArray(arr) && !arr.includes(tag)) arr.push(tag);
  });
  return map;
};

const normalizePhotos = (rawPhotos, avatarUrl) => {
  const out = [];

  const avatar = String(avatarUrl || '').trim();
  if (avatar) out.push({ url: avatar, isPrimary: true });

  const unwrap = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
      if (Array.isArray(value.urls)) return value.urls;
      if (Array.isArray(value.items)) return value.items;
      if (Array.isArray(value.photos)) return value.photos;
    }
    return [];
  };

  const list = unwrap(rawPhotos);
  for (const item of list) {
    if (typeof item === 'string') {
      const url = item.trim();
      if (!url) continue;
      if (out.some((p) => p.url === url)) continue;
      out.push({ url, isPrimary: out.length === 0 });
      continue;
    }

    if (!item || typeof item !== 'object') continue;
    const url = String(item.url || item.file_url || item.href || '').trim();
    if (!url) continue;

    const isPrimary = !!(item.isPrimary ?? item.is_primary ?? item.primary);
    const isPremium = !!(item.is_premium ?? item.isPremium ?? item.premium);

    if (out.some((p) => p.url === url)) continue;
    out.push({ url, isPrimary: isPrimary || out.length === 0, ...(isPremium ? { is_premium: true } : {}) });
  }

  const primaryIndex = out.findIndex((p) => p.isPrimary);
  const normalized = out.map((p, idx) => ({ ...p, isPrimary: primaryIndex === -1 ? idx === 0 : idx === primaryIndex }));
  return normalized.slice(0, 5);
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const normalizeDetails = (details) => {
  if (!details) return null;
  if (typeof details === 'object') return details;
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const getHasProductsMap = async ({ client, emails }) => {
  const list = (Array.isArray(emails) ? emails : [])
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  if (!client || list.length === 0) return new Map();

  const uniq = Array.from(new Set(list));
  const out = new Map(uniq.map((e) => [e, false]));

  try {
    const { data, error } = await client
      .from('products')
      .select('seller_email')
      .eq('status', 'active')
      .in('seller_email', uniq)
      .limit(2000);

    if (error) return out;
    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      const email = normalizeEmail(row?.seller_email);
      if (!email) continue;
      if (out.has(email)) out.set(email, true);
    }
  } catch {
    return out;
  }

  return out;
};

const getProductPreviewUrl = (product) => {
  const urls = Array.isArray(product?.image_urls) ? product.image_urls : [];
  for (const raw of urls) {
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (url) return url;
  }

  const details = normalizeDetails(product?.details);
  const detailUrls = Array.isArray(details?.image_urls) ? details.image_urls : [];
  for (const raw of detailUrls) {
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (url) return url;
  }

  return null;
};

const getProductPreviewsMap = async ({ client, emails, maxPerSeller = 3 }) => {
  const list = (Array.isArray(emails) ? emails : [])
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  if (!client || list.length === 0) return new Map();

  const uniq = Array.from(new Set(list));
  const out = new Map();

  try {
    const { data, error } = await client
      .from('products')
      .select('id,seller_email,image_urls,details,updated_at,created_at,status')
      .eq('status', 'active')
      .in('seller_email', uniq)
      .order('updated_at', { ascending: false })
      .limit(2000);

    if (error) return out;
    const rows = Array.isArray(data) ? data : [];

    for (const row of rows) {
      const email = normalizeEmail(row?.seller_email);
      if (!email) continue;

      const url = getProductPreviewUrl(row);
      if (!url) continue;

      const current = out.get(email) || [];
      if (current.length >= maxPerSeller) continue;
      if (current.some((p) => p?.imageUrl === url)) continue;

      current.push({
        id: row?.id ? String(row.id) : undefined,
        imageUrl: url,
      });

      out.set(email, current);
    }
  } catch {
    return out;
  }

  return out;
};

const getAuthMetaMapById = async ({ serviceClient, authUserIds }) => {
  if (!serviceClient?.auth?.admin?.getUserById) return new Map();
  const ids = (Array.isArray(authUserIds) ? authUserIds : []).filter(Boolean);
  if (!ids.length) return new Map();

  const map = new Map();

  // Limit concurrency to avoid hammering auth admin API.
  const concurrency = 6;
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, ids.length) }).map(async () => {
    while (idx < ids.length) {
      const current = ids[idx];
      idx += 1;
      try {
        const { data, error } = await serviceClient.auth.admin.getUserById(current);
        if (error || !data?.user) continue;
        map.set(String(current), data.user.user_metadata || {});
      } catch {
        // ignore
      }
    }
  });

  await Promise.all(workers);
  return map;
};

const queryUsersWithFallbackOrder = async ({ serviceClient, offset, limit }) => {
  // profiles is the canonical table (consolidated from "User" in migration 20260310000004).
  // Fall back to updated_at ordering if last_loc_ts isn't populated yet.
  const base = serviceClient.from('profiles').select('*');

  const tryOrder = async (column) => {
    return base
      .order(column, { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
  };

  const first = await tryOrder('last_loc_ts');
  if (!first?.error) return first;

  const msg = String(first?.error?.message || '').toLowerCase();
  if (msg.includes('column') && msg.includes('last_loc_ts')) {
    return tryOrder('updated_at');
  }

  return first;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Allow public read access to profiles (discovery feature for unauthenticated users)
  // Authentication is optional - when present, we validate it
  const accessToken = getBearerToken(req);

  const cursorRaw = getQueryParam(req, 'cursor');
  const offset = clampInt(cursorRaw ?? 0, 0, 100000, 0);
  const limit = clampInt(getQueryParam(req, 'limit') ?? 40, 1, 60, 40);

  const { error: supaErr, serviceClient, anonClient: anonClientFromEnv } = getSupabaseServerClients();

  // If token provided, validate it and extract user for block filtering
  let currentAuthUserId = null;
  if (accessToken && anonClientFromEnv) {
    const { data, error } = await anonClientFromEnv.auth.getUser(accessToken);
    if (error || !data?.user) {
      console.log('[profiles] Invalid auth token provided, continuing as anonymous');
    } else {
      currentAuthUserId = data.user.id;
    }
  }

  // If Supabase is not configured, return fallback profiles
  if (supaErr || !serviceClient) {
    const items = offset === 0 ? buildFallbackProfiles() : [];
    const unique = dedupeItems(items);
    return json(res, 200, { items: unique, nextCursor: offset === 0 ? String(items.length) : null });
  }

  // Query profiles from database
  // Simple cursor pagination: cursor is an integer offset (opaque enough for demo).
  const { data, error } = await queryUsersWithFallbackOrder({ serviceClient, offset, limit });

  if (error) {
    const items = offset === 0 ? buildFallbackProfiles() : [];
    const unique = dedupeItems(items);
    return json(res, 200, { items: unique, nextCursor: offset === 0 ? String(items.length) : null });
  }

  let rows = Array.isArray(data) ? data : [];

    // Exclude ghost/test/internal profiles from the grid.
    // Demo seed profiles (is_demo = true) are intentionally KEPT — they prevent
    // empty-grid drop-off for new users.
    rows = rows.filter((r) => {
      // Demo seed profiles bypass the filter UNLESS they're e2e test accounts
      if (r?.is_demo === true) {
        const e = String(r?.email || '').toLowerCase();
        if (e.startsWith('e2e.') || e.includes('e2e-boot-test')) return false;
        return true;
      }
      const email = String(r?.email || '').trim().toLowerCase();
      const uname = String(r?.username || '').trim().toLowerCase();
      const candidates = [email, uname].filter(Boolean);
      for (const addr of candidates) {
        if (addr.endsWith('@hotmess.app')) return false;
        if (addr.endsWith('@hotmess.test')) return false;
        if (addr.endsWith('@hotmess.internal')) return false;
        if (addr === 'demo@hotmessldn.com') return false;
        if (addr === 'admin@hotmessldn.com') return false;
        if (addr.includes('e2e-boot-test')) return false;
        if (addr.startsWith('e2e.') && addr.includes('@hotmess')) return false;
      }
      return true;
    });

    // Self-exclusion: the logged-in user must never appear in their own Ghosted grid
    if (currentAuthUserId) {
      rows = rows.filter((r) => {
        const rowAuthId = r?.auth_user_id ? String(r.auth_user_id) : null;
        const rowId = r?.id ? String(r.id) : null;
        return rowAuthId !== currentAuthUserId && rowId !== currentAuthUserId;
      });
    }

    // Block filtering: exclude users the current user has blocked (and users who blocked them)
    // user_blocks uses email columns (blocker_email, blocked_email)
    if (currentAuthUserId && serviceClient) {
      try {
        const { data: { user: authUser } } = await serviceClient.auth.admin.getUserById(currentAuthUserId);
        const myEmail = authUser?.email;

        if (myEmail) {
          const { data: blocks } = await serviceClient
            .from('user_blocks')
            .select('blocker_email, blocked_email')
            .or(`blocker_email.eq.${myEmail},blocked_email.eq.${myEmail}`);

          if (Array.isArray(blocks) && blocks.length > 0) {
            const blockedEmails = new Set();
            blocks.forEach((b) => {
              if (b.blocker_email === myEmail) blockedEmails.add(b.blocked_email);
              if (b.blocked_email === myEmail) blockedEmails.add(b.blocker_email);
            });
            rows = rows.filter((r) => {
              const email = r?.email ? String(r.email).trim().toLowerCase() : null;
              return !email || !blockedEmails.has(email);
            });
          }
        }
      } catch {
        // Best-effort — grid still works without block filtering
      }
    }

    // Fetch profile_photos for all users (best-effort).
    // profile_photos table stores up to 6 photos per user with position ordering.
    let profilePhotosById = new Map();
    try {
      const profileIds = rows.map((r) => r?.id).filter(Boolean).map(String);
      if (profileIds.length) {
        const { data: photoRows } = await serviceClient
          .from('profile_photos')
          .select('profile_id, url, position, is_primary')
          .in('profile_id', profileIds)
          .order('position', { ascending: true });
        if (Array.isArray(photoRows)) {
          for (const p of photoRows) {
            const pid = String(p.profile_id);
            if (!profilePhotosById.has(pid)) profilePhotosById.set(pid, []);
            profilePhotosById.get(pid).push({ url: p.url, isPrimary: !!p.is_primary });
          }
        }
      }
    } catch {
      // Best-effort — grid still works with avatar_url only
    }

    // Attach auth user metadata (best-effort) so the grid can show multi-photo profiles,
    // even when those fields are stored in auth metadata (Base44-style).
    // profiles.id = auth.uid(); older "User" rows may have auth_user_id instead.
    const authUserIds = rows.map((r) => {
      const uid = r?.auth_user_id || r?.id;
      return uid ? String(uid) : null;
    }).filter(Boolean);

    const authMetaById = await getAuthMetaMapById({
      serviceClient,
      authUserIds,
    });

    // Build public_attributes map from the rows themselves (already from profiles table).
    // profiles.id = auth.uid(), so use r.id as the key.
    let publicAttrsById = new Map();
    try {
      rows.forEach((r) => {
        const uid = r?.auth_user_id || r?.id;
        if (!uid) return;
        const attrs = r?.public_attributes;
        if (attrs && typeof attrs === 'object') {
          publicAttrsById.set(String(uid), attrs);
        }
      });
    } catch {
      // best-effort — grid still works without these
    }

    // Attach tags (best-effort; ignore errors / missing table).
    let tagMap = new Map();
    try {
      const emails = rows
        .map((r) => (r?.email ? String(r.email).trim().toLowerCase() : null))
        .filter(Boolean);

      if (emails.length) {
        const { data: tagRows } = await serviceClient
          .from('user_tags')
          .select('user_email, tag_id')
          .in('user_email', emails);
        tagMap = buildTagMap(tagRows);
      }
    } catch {
      // ignore
    }

    const sellerEmails = rows
      .filter((r) => String(r?.profile_type || '').trim().toLowerCase() === 'seller')
      .map((r) => r?.email)
      .filter(Boolean);
    const hasProductsByEmail = await getHasProductsMap({ client: serviceClient, emails: sellerEmails });
    const productPreviewsByEmail = await getProductPreviewsMap({ client: serviceClient, emails: sellerEmails, maxPerSeller: 3 });

    const mapped = rows
      .map((row) => {
        // Demo profiles (is_demo = true) are intentionally included in the grid
        // to prevent empty-grid drop-off for new users. Filter in analytics only.
        // Coordinates: profiles table has no lat/lng columns — presence table holds
        // PostGIS geography. For now we fall back to central London so all profiles
        // (real and demo) render in the grid. TODO: join presence for precise coords.
        const LONDON_LAT = 51.5074;
        const LONDON_LNG = -0.1276;
        const rawLat = row?.last_lat ?? row?.lat;
        const rawLng = row?.last_lng ?? row?.lng;
        const lat = Number.isFinite(Number(rawLat)) ? Number(rawLat) : LONDON_LAT;
        const lng = Number.isFinite(Number(rawLng)) ? Number(rawLng) : LONDON_LNG;

        // PRIVACY: username is the public handle — never expose real name or email
        // GDPR FIX: if username looks like an email address, treat it as empty
        const rawUsername = String(row?.username || '').trim();
        const username = rawUsername.includes('@') ? '' : rawUsername;
        const rawDisplayName = String(row?.display_name || '').trim();
        const rawFullName = String(row?.full_name || '').trim();
        const displayName = username || (rawDisplayName.includes('@') ? '' : rawDisplayName) || (rawFullName.includes('@') ? '' : rawFullName);
        if (!displayName) return null; // Reject profiles without a valid non-email name
        const uniqueId = row?.id ? String(row.id).trim() : null;
        // profiles.id = auth.uid(); legacy "User" rows may have auth_user_id
        const authUserId = row?.auth_user_id ? String(row.auth_user_id).trim() : uniqueId;
        const dedupeKey = String(authUserId || displayName).trim();
        const avatar = String(row?.avatar_url || '').trim();
        // Keep email internal for lookups but don't expose in response
        const emailInternal = row?.email ? String(row.email).trim() : null;

        const meta = authUserId ? authMetaById.get(authUserId) : null;
        const pubAttrs = authUserId ? (publicAttrsById.get(authUserId) || {}) : {};

        const gender = getGenderValue({ row, meta });
        const photoPolicyAck = getPhotoPolicyAck({ row, meta });
        if (isFemaleGender(gender)) return null;
        if (photoPolicyAck === false) return null;

        const rawPhotos = (row && typeof row === 'object' ? row.photos : null) ?? meta?.photos;
        // Merge profile_photos table rows (canonical multi-photo) with legacy sources
        const dbPhotos = uniqueId ? profilePhotosById.get(String(uniqueId)) : null;
        const mergedRawPhotos = dbPhotos && dbPhotos.length ? dbPhotos : rawPhotos;
        const photos = normalizePhotos(mergedRawPhotos, avatar);

        const sellerTagline = String(meta?.seller_tagline || '').trim() || undefined;
        const sellerBio = String(meta?.seller_bio || '').trim() || undefined;
        const shopBannerUrl = String(meta?.shop_banner_url || '').trim() || undefined;

        const tier = String(row?.subscription_tier || '').toUpperCase();
        const tierLabel = tier === 'PAID' ? 'Member (PAID)' : 'Member';

        const city = row?.city ? String(row.city).trim() : null;
        const profileType = row?.profile_type ? String(row.profile_type).trim() : null;
        const bio = row?.bio ? String(row.bio).trim() : (typeof meta?.bio === 'string' ? String(meta.bio).trim() : null);
        const title = toShortHeadline(bio, tierLabel);

        const tags = emailInternal ? tagMap.get(String(emailInternal).toLowerCase()) : null;
        const safeTags = Array.isArray(tags) ? tags.slice(0, 5) : [];

        const isSellerProfile = profileType && String(profileType).trim().toLowerCase() === 'seller';
        const hasProducts = isSellerProfile && emailInternal ? hasProductsByEmail.get(String(emailInternal).toLowerCase()) === true : undefined;
        const productPreviews = isSellerProfile && emailInternal ? productPreviewsByEmail.get(String(emailInternal).toLowerCase()) : undefined;

        return {
          id: `profile_${dedupeKey}`,
          oderId: uniqueId || undefined,
          // PRIVACY: Never expose email - use userId for routing
          userId: authUserId || uniqueId || undefined,
          authUserId: authUserId || undefined,
          username: username || undefined,
          profileName: displayName,
          title,
          locationLabel: city || 'Nearby',
          city: city || undefined,
          profileType: profileType || undefined,
          hasProducts,
          productPreviews: Array.isArray(productPreviews) && productPreviews.length ? productPreviews : undefined,
          bio: bio || undefined,
          gender: normalizeGender(gender) || undefined,
          photo_policy_ack: photoPolicyAck === true ? true : undefined,
          tag_ids: safeTags,
          sellerTagline,
          sellerBio,
          shopBannerUrl,
          tags: safeTags,
          geoLat: lat,
          geoLng: lng,
          photos,
          // New fields for Grindr-style UI
          is_online: row?.is_online === true,
          last_seen: row?.last_seen || row?.last_loc_ts || undefined,
          // public_attributes takes precedence over legacy row fields
          looking_for: Array.isArray(pubAttrs?.looking_for)
            ? pubAttrs.looking_for
            : Array.isArray(row?.looking_for)
              ? row.looking_for
              : undefined,
          position: pubAttrs?.position || row?.position || undefined,
          orientation: pubAttrs?.orientation || row?.orientation || undefined,
          body_type: pubAttrs?.body_type || row?.body_type || undefined,
          pronouns: pubAttrs?.pronouns || row?.pronouns || undefined,
          hosting: pubAttrs?.hosting || undefined,
          age: typeof pubAttrs?.age === 'number' ? pubAttrs.age : (typeof row?.age === 'number' ? row.age : undefined),
          is_verified: row?.is_verified === true,
          verification_level: row?.verification_level || 'none',
          photo_count: photos.length,
        };
      })
      .filter(Boolean);

  // Rank-sort: verified + photos + online → higher position
  const ranked = mapped.map((p) => {
    const verifiedBoost = p.is_verified ? 0.15 : 0;
    const onlineBoost = p.is_online ? 0.15 : 0;
    const photoScore = p.photo_count === 0 ? 0.06 : p.photo_count === 1 ? 0.12 : Math.min(0.2, p.photo_count * 0.05);
    const randomness = Math.random() * 0.1;
    const rankScore = verifiedBoost + onlineBoost + photoScore + randomness + 0.4; // base 0.4
    return { ...p, rankScore };
  });
  ranked.sort((a, b) => b.rankScore - a.rankScore);

  const items = dedupeItems(ranked);
  const nextCursor = rows.length === limit ? String(offset + limit) : null;
  return json(res, 200, { items, nextCursor });
}

