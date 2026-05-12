/**
 * POST /api/ghosted/photo-signed-url
 *
 * Mints a 5-minute signed URL for a vault photo, but only after verifying the
 * caller has either:
 *   (a) owns the photo, OR
 *   (b) has an active share on the album AND (if album.is_xxx) has xxx_access
 *
 * Every successful mint is logged to ghosted_photo_access_log for forensics.
 *
 * Body:    { photo_id: uuid }
 * Auth:    Authorization: Bearer <supabase-jwt>
 * Returns: 200 { url, expires_at }
 *          401 no auth / invalid token
 *          403 no access
 *          404 photo missing / not approved
 *          500 unexpected
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function dailySalt() {
  const day = new Date().toISOString().slice(0, 10);
  return day + (process.env.PHOTO_LOG_SALT || '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'server not configured' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'missing auth' });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: userResult, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userResult?.user) {
    return res.status(401).json({ error: 'invalid auth' });
  }
  const userId = userResult.user.id;

  const photoId = req.body?.photo_id;
  if (!photoId || typeof photoId !== 'string') {
    return res.status(400).json({ error: 'photo_id required' });
  }

  // Fetch photo + parent album in a single query
  const { data: photo, error: photoErr } = await admin
    .from('ghosted_album_photos')
    .select('id, album_id, owner_id, storage_path, scan_status, ghosted_albums!inner(id, is_xxx, archived_at)')
    .eq('id', photoId)
    .maybeSingle();

  if (photoErr || !photo) {
    return res.status(404).json({ error: 'photo not found' });
  }
  if (photo.scan_status !== 'approved') {
    return res.status(403).json({ error: 'photo not approved' });
  }
  if (photo.ghosted_albums?.archived_at) {
    return res.status(404).json({ error: 'album archived' });
  }

  // Access check: owner always passes; otherwise needs active share (+ xxx if applicable)
  if (photo.owner_id !== userId) {
    const { data: hasShare } = await admin.rpc('has_active_album_share', {
      p_album_id: photo.album_id,
      p_user_id: userId,
    });
    if (!hasShare) return res.status(403).json({ error: 'no active share' });

    if (photo.ghosted_albums?.is_xxx) {
      const { data: hasXxx } = await admin.rpc('has_xxx_access', { p_user_id: userId });
      if (!hasXxx) return res.status(403).json({ error: 'xxx access denied' });
    }
  }

  // Mint signed URL
  const { data: signed, error: signErr } = await admin.storage
    .from('ghosted-photos')
    .createSignedUrl(photo.storage_path, 300);

  if (signErr || !signed?.signedUrl) {
    return res.status(500).json({ error: 'signing failed' });
  }

  // Forensics log — fire and forget, never block the response
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
  const ua = (req.headers['user-agent'] || '').slice(0, 200);
  admin
    .from('ghosted_photo_access_log')
    .insert({
      photo_id: photoId,
      viewer_id: userId,
      ip_hash: sha256(ip + dailySalt()),
      user_agent: ua,
    })
    .then(() => {}, () => {});

  return res.status(200).json({
    url: signed.signedUrl,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
}
