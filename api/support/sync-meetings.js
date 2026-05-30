/**
 * HOTMESS v6 — Support Proximity: Meeting Sync
 * api/support/sync-meetings.js
 *
 * Fetches AA/NA meetings from TSML-format sources and upserts into support_meetings.
 * Focused on London (lat 51.5074, lng -0.1278), radius 15km.
 *
 * Sources (in priority order):
 *   1. London Intergroup AA (TSML WordPress API)
 *   2. AA Great Britain national (TSML)
 *   3. NA UK (TSML)
 *
 * TSML spec: https://code4recovery.github.io/spec/
 * Day format: 0=Sunday … 6=Saturday (matches our schema)
 *
 * Auth: CRON_SECRET header — same as other crons.
 * Called by: vercel.json cron + admin POST
 *
 * PRIVACY: no user data involved. Meeting data is public directory information.
 */

import { createClient } from '@supabase/supabase-js';

// ── London bounding box (±15km) ───────────────────────────────────────────────
const LONDON_LAT  = 51.5074;
const LONDON_LNG  = -0.1278;
const RADIUS_KM   = 15;

// ── TSML sources — ordered by coverage quality for London ────────────────────
const TSML_SOURCES = [
  {
    url:  'https://londonintergroup.co.uk/wp-json/tsml/v1/meetings',
    type: 'aa',
    name: 'AA London Intergroup',
  },
  {
    url:  'https://www.alcoholicsanonymous.org.uk/wp-json/tsml/v1/meetings',
    type: 'aa',
    name: 'AA Great Britain',
  },
  {
    url:  'https://www.ukna.org/wp-json/tsml/v1/meetings',
    type: 'na',
    name: 'NA UK',
  },
];

// ── Haversine distance (km) ───────────────────────────────────────────────────
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── TSML → support_meetings row ──────────────────────────────────────────────
function tsmlToRow(meeting, sourceType) {
  const lat = parseFloat(meeting.latitude  ?? meeting.lat ?? '');
  const lng = parseFloat(meeting.longitude ?? meeting.lng ?? '');
  if (isNaN(lat) || isNaN(lng)) return null;
  if (distanceKm(LONDON_LAT, LONDON_LNG, lat, lng) > RADIUS_KM) return null;

  // TSML day: 0=Sunday … 6=Saturday — same as our schema
  const dayRaw = parseInt(meeting.day ?? meeting.day_of_week ?? '', 10);
  if (isNaN(dayRaw) || dayRaw < 0 || dayRaw > 6) return null;

  // TSML time: "HH:MM" or "HH:MM:SS"
  const timeRaw = String(meeting.time ?? meeting.start_time ?? '').trim();
  if (!timeRaw || !/^\d{2}:\d{2}/.test(timeRaw)) return null;
  const start_time = timeRaw.length === 5 ? `${timeRaw}:00` : timeRaw;

  // Infer meeting_type from TSML types array or source
  const types = Array.isArray(meeting.types) ? meeting.types.map(t => String(t).toUpperCase()) : [];
  let meeting_type = sourceType; // 'aa' or 'na' from source config
  if (types.some(t => t === 'NA' || t.includes('NARCOTIC'))) meeting_type = 'na';
  if (types.some(t => t === 'AA' || t.includes('ALCOHOL')))  meeting_type = 'aa';

  return {
    // Stable external ID: use TSML slug or name+day+time combo
    external_id:  String(meeting.slug ?? meeting.id ?? `${meeting.name}-${dayRaw}-${timeRaw}`),
    meeting_type,
    name:        String(meeting.name ?? meeting.meeting ?? '').slice(0, 200) || null,
    lat:         lat.toFixed(6),
    lng:         lng.toFixed(6),
    day_of_week: dayRaw,
    start_time,
    is_active:   true,
  };
}

// ── Fetch one TSML source with timeout ───────────────────────────────────────
async function fetchTsmlSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'HOTMESS-MeetingSync/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // TSML returns array directly or { meetings: [...] }
    const meetings = Array.isArray(data) ? data : (data.meetings ?? []);
    return { source: source.name, meetings, error: null };
  } catch (err) {
    return { source: source.name, meetings: [], error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Auth: cron secret or admin POST
  const secret = req.headers['x-cron-secret'] ?? req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const results = { sources: [], inserted: 0, updated: 0, skipped: 0, errors: [] };

  // Fetch all sources in parallel
  const fetches = await Promise.all(TSML_SOURCES.map(fetchTsmlSource));

  // Deduplicate across sources by external_id
  const rowMap = new Map();
  for (const { source, meetings, error } of fetches) {
    if (error) {
      results.errors.push(`${source}: ${error}`);
      results.sources.push({ source, count: 0, error });
      continue;
    }

    let count = 0;
    const sourceType = TSML_SOURCES.find(s => s.name === source)?.type ?? 'other';
    for (const m of meetings) {
      const row = tsmlToRow(m, sourceType);
      if (!row) continue;
      if (!rowMap.has(row.external_id)) {
        rowMap.set(row.external_id, row);
        count++;
      }
    }
    results.sources.push({ source, count, error: null });
  }

  const rows = Array.from(rowMap.values());

  if (rows.length === 0) {
    return res.status(200).json({
      ok: true,
      message: 'No meetings found within radius — sources may be down',
      ...results,
    });
  }

  // Upsert in batches of 100
  // external_id column needed — add it if not present (migration adds it)
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('support_meetings')
      .upsert(batch, { onConflict: 'external_id', ignoreDuplicates: false });
    if (error) {
      results.errors.push(`upsert batch ${i / BATCH}: ${error.message}`);
    } else {
      results.inserted += batch.length;
    }
  }

  // Mark meetings not in this sync as inactive (stale data)
  const activeIds = rows.map(r => r.external_id);
  if (activeIds.length > 0) {
    const { error: deactivateErr } = await supabase
      .from('support_meetings')
      .update({ is_active: false })
      .not('external_id', 'in', `(${activeIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')})`)
      .eq('is_active', true);
    if (deactivateErr) results.errors.push(`deactivate stale: ${deactivateErr.message}`);
  }

  return res.status(200).json({
    ok: results.errors.length === 0,
    total_rows: rows.length,
    ...results,
  });
}
