import crypto from 'node:crypto';
import { getBearerToken, getEnv, json, readJsonBody } from '../shopify/_utils.js';
import { createSupabaseClients } from '../events/_admin.js';

export { getBearerToken, getEnv, json, readJsonBody };

export const getRequestIp = (req) => {
  const header = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw && String(raw).trim()) return String(raw).split(',')[0].trim();
  const cf = req.headers?.['cf-connecting-ip'] || req.headers?.['CF-Connecting-IP'];
  const cfRaw = Array.isArray(cf) ? cf[0] : cf;
  if (cfRaw && String(cfRaw).trim()) return String(cfRaw).trim();
  return null;
};

export const parseNumber = (value) => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
};

export const bucketLatLng = (lat, lng, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  const bLat = Math.round(lat * factor) / factor;
  const bLng = Math.round(lng * factor) / factor;
  return `${bLat.toFixed(decimals)},${bLng.toFixed(decimals)}`;
};

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export const cacheKeyFor = ({ originBucket, destBucket, mode, timeSlice }) => {
  return sha256(`${originBucket}|${destBucket}|${mode}|${timeSlice}`);
};

export const toSecondsFromGoogleDuration = (duration) => {
  // Routes API v2 returns a string like "123s".
  if (typeof duration === 'string') {
    const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
    if (match) return Math.round(Number(match[1]));
  }
  // Distance Matrix returns seconds as number sometimes.
  if (typeof duration === 'number' && Number.isFinite(duration)) return Math.round(duration);
  return null;
};

export const getSupabaseServerClients = () => {
  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return { error: 'Supabase server env not configured', supabaseUrl: null, anonClient: null, serviceClient: null };
  }

  const { anonClient, serviceClient } = createSupabaseClients({
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  });

  return { error: null, supabaseUrl, anonClient, serviceClient };
};

export const getAuthedUser = async ({ anonClient, accessToken }) => {
  const { data, error } = await anonClient.auth.getUser(accessToken);
  if (error || !data?.user) return { user: null, error: error || new Error('Invalid auth token') };
  return { user: data.user, error: null };
};

export const requireGoogleApiKey = () => {
  const key = getEnv('GOOGLE_MAPS_API_KEY');
  if (!key) return { key: null, error: 'Missing GOOGLE_MAPS_API_KEY' };
  return { key, error: null };
};

export const normalizeMode = (mode) => {
  const raw = String(mode || '').toUpperCase();
  if (raw === 'WALK' || raw === 'WALKING') return 'WALK';
  if (raw === 'TRANSIT' || raw === 'PUBLIC_TRANSPORT') return 'TRANSIT';
  if (raw === 'DRIVE' || raw === 'DRIVING') return 'DRIVE';
  if (raw === 'BICYCLE' || raw === 'BIKE' || raw === 'BICYCLING' || raw === 'CYCLING') return 'BICYCLE';
  if (raw === 'TWO_WHEELER' || raw === 'MOTORCYCLE' || raw === 'SCOOTER' || raw === 'MOTO') return 'TWO_WHEELER';
  return null;
};
