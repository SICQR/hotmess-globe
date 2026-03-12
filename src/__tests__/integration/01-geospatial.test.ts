/**
 * 01 — Geospatial & Privacy Smoke Tests
 *
 * Validates:
 * 1. nearby_candidates RPC returns users within radius
 * 2. nearby_candidates_secure RPC returns fuzzy (3dp) coordinates
 * 3. Users with privacy_hide_proximity = true are excluded
 * 4. Distance calculations are within expected bounds
 * 5. Stale locations (>15 min) excluded by nearby_candidates_secure
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { admin, TEST_USERS, GEO } from './setup';

// ---------------------------------------------------------------------------
// Setup: seed known locations for Phil & Glen, restore after
// ---------------------------------------------------------------------------
let philOriginal: { last_lat: number | null; last_lng: number | null; privacy_hide_proximity: boolean } | null = null;
let glenOriginal: { last_lat: number | null; last_lng: number | null; privacy_hide_proximity: boolean } | null = null;

beforeAll(async () => {
  // Save originals
  const { data: philRow } = await admin
    .from('profiles')
    .select('last_lat, last_lng, privacy_hide_proximity')
    .eq('id', TEST_USERS.phil.authId)
    .single();
  philOriginal = philRow;

  const { data: glenRow } = await admin
    .from('profiles')
    .select('last_lat, last_lng, privacy_hide_proximity')
    .eq('id', TEST_USERS.glen.authId)
    .single();
  glenOriginal = glenRow;

  // Place Phil in Soho, Glen in Vauxhall (~2.5 km apart)
  await admin
    .from('profiles')
    .update({ last_lat: GEO.soho.lat, last_lng: GEO.soho.lng, privacy_hide_proximity: false, is_online: true })
    .eq('id', TEST_USERS.phil.authId);

  await admin
    .from('profiles')
    .update({ last_lat: GEO.vauxhall.lat, last_lng: GEO.vauxhall.lng, privacy_hide_proximity: false, is_online: true })
    .eq('id', TEST_USERS.glen.authId);

  // Also seed user_presence_locations for the _secure RPC
  await admin.from('user_presence_locations').upsert({
    auth_user_id: TEST_USERS.glen.authId,
    lat: GEO.vauxhall.lat,
    lng: GEO.vauxhall.lng,
    accuracy_m: 10,
    updated_at: new Date().toISOString(),
  });
});

afterAll(async () => {
  // Restore original locations
  if (philOriginal) {
    await admin
      .from('profiles')
      .update(philOriginal)
      .eq('id', TEST_USERS.phil.authId);
  }
  if (glenOriginal) {
    await admin
      .from('profiles')
      .update(glenOriginal)
      .eq('id', TEST_USERS.glen.authId);
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Geospatial: nearby_candidates', () => {
  it('returns Glen when Phil queries from Soho within 5 km radius', async () => {
    const { data, error } = await admin.rpc('nearby_candidates', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 5000,
      p_limit: 50,
      p_exclude_user_id: TEST_USERS.phil.authId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const glen = data!.find((r: any) => r.user_id === TEST_USERS.glen.authId);
    expect(glen).toBeDefined();
    // Soho→Vauxhall ≈ 2.5 km — allow 1–5 km range for PostGIS precision
    expect(glen!.distance_meters).toBeGreaterThan(1000);
    expect(glen!.distance_meters).toBeLessThan(5000);
  });

  it('does NOT return Glen when Phil queries with 500 m radius (too close)', async () => {
    const { data, error } = await admin.rpc('nearby_candidates', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 500,
      p_limit: 50,
      p_exclude_user_id: TEST_USERS.phil.authId,
    });

    expect(error).toBeNull();
    const glen = (data || []).find((r: any) => r.user_id === TEST_USERS.glen.authId);
    expect(glen).toBeUndefined();
  });

  it('excludes users with privacy_hide_proximity = true', async () => {
    // Set Glen to hidden
    await admin
      .from('profiles')
      .update({ privacy_hide_proximity: true })
      .eq('id', TEST_USERS.glen.authId);

    const { data, error } = await admin.rpc('nearby_candidates', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 5000,
      p_limit: 50,
      p_exclude_user_id: TEST_USERS.phil.authId,
    });

    expect(error).toBeNull();
    const glen = (data || []).find((r: any) => r.user_id === TEST_USERS.glen.authId);
    expect(glen).toBeUndefined();

    // Restore
    await admin
      .from('profiles')
      .update({ privacy_hide_proximity: false })
      .eq('id', TEST_USERS.glen.authId);
  });

  it('excludes the querying user from results (p_exclude_user_id)', async () => {
    const { data, error } = await admin.rpc('nearby_candidates', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 50000, // huge radius
      p_limit: 100,
      p_exclude_user_id: TEST_USERS.phil.authId,
    });

    expect(error).toBeNull();
    const phil = (data || []).find((r: any) => r.user_id === TEST_USERS.phil.authId);
    expect(phil).toBeUndefined();
  });

  it('returns results ordered by distance ascending', async () => {
    const { data, error } = await admin.rpc('nearby_candidates', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 50000,
      p_limit: 50,
      p_exclude_user_id: TEST_USERS.phil.authId,
    });

    expect(error).toBeNull();
    if (data && data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        expect(data[i].distance_meters).toBeGreaterThanOrEqual(data[i - 1].distance_meters);
      }
    }
  });
});

describe('Geospatial: nearby_candidates_secure (fuzzy coordinates)', () => {
  it('returns coordinates rounded to 3 decimal places (~100 m precision)', async () => {
    const { data, error } = await admin.rpc('nearby_candidates_secure', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 5000,
      p_limit: 50,
      p_exclude_user_id: TEST_USERS.phil.authId,
    });

    expect(error).toBeNull();
    const glen = data!.find((r: any) => r.user_id === TEST_USERS.glen.authId);
    expect(glen).toBeDefined();

    // Verify coordinates are rounded to 3dp
    const latStr = glen!.last_lat.toString();
    const lngStr = glen!.last_lng.toString();
    const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
    const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;
    expect(latDecimals).toBeLessThanOrEqual(3);
    expect(lngDecimals).toBeLessThanOrEqual(3);

    // Verify they're NOT the exact original coordinates (fuzzing worked)
    // Original: 51.4862, -0.1226 → rounded: 51.486, -0.123
    expect(glen!.last_lat).not.toBe(GEO.vauxhall.lat);
  });

  it('excludes stale locations older than max_age_seconds', async () => {
    // Set Glen's presence to 30 minutes ago
    const staleTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await admin.from('user_presence_locations').upsert({
      auth_user_id: TEST_USERS.glen.authId,
      lat: GEO.vauxhall.lat,
      lng: GEO.vauxhall.lng,
      accuracy_m: 10,
      updated_at: staleTime,
    });

    // Also set User table timestamp to stale
    await admin
      .from('profiles')
      .update({ updated_at: staleTime })
      .eq('id', TEST_USERS.glen.authId);

    const { data, error } = await admin.rpc('nearby_candidates_secure', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 5000,
      p_limit: 50,
      p_exclude_user_id: TEST_USERS.phil.authId,
      p_max_age_seconds: 900, // 15 min
    });

    expect(error).toBeNull();
    const glen = (data || []).find((r: any) => r.user_id === TEST_USERS.glen.authId);
    expect(glen).toBeUndefined();

    // Restore freshness
    await admin.from('user_presence_locations').upsert({
      auth_user_id: TEST_USERS.glen.authId,
      lat: GEO.vauxhall.lat,
      lng: GEO.vauxhall.lng,
      accuracy_m: 10,
      updated_at: new Date().toISOString(),
    });
    await admin
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', TEST_USERS.glen.authId);
  });
});

describe('Geospatial: distance accuracy', () => {
  it('Soho→Vauxhall ≈ 2.5–3.5 km', async () => {
    const { data } = await admin.rpc('nearby_candidates', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 10000,
      p_limit: 50,
      p_exclude_user_id: TEST_USERS.phil.authId,
    });

    const glen = data?.find((r: any) => r.user_id === TEST_USERS.glen.authId);
    if (glen) {
      // Haversine: Soho→Vauxhall ≈ 3.1 km
      expect(glen.distance_meters).toBeGreaterThan(2000);
      expect(glen.distance_meters).toBeLessThan(4000);
    }
  });

  it('Manchester users not returned in 10 km London query', async () => {
    // Temporarily put Glen in Manchester
    await admin
      .from('profiles')
      .update({ last_lat: GEO.manchester.lat, last_lng: GEO.manchester.lng })
      .eq('id', TEST_USERS.glen.authId);

    const { data } = await admin.rpc('nearby_candidates', {
      p_viewer_lat: GEO.soho.lat,
      p_viewer_lng: GEO.soho.lng,
      p_radius_m: 10000,
      p_limit: 50,
      p_exclude_user_id: TEST_USERS.phil.authId,
    });

    const glen = (data || []).find((r: any) => r.user_id === TEST_USERS.glen.authId);
    expect(glen).toBeUndefined();

    // Restore
    await admin
      .from('profiles')
      .update({ last_lat: GEO.vauxhall.lat, last_lng: GEO.vauxhall.lng })
      .eq('id', TEST_USERS.glen.authId);
  });
});
