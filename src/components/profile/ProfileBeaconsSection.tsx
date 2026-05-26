/**
 * ProfileBeaconsSection — Active beacons surfaced on a user's profile.
 *
 * Closes the loop opened in PR #406 (beacon ring around recents avatars):
 *   ring → profile → ACTIVE BEACONS list → tap → globe flies to it.
 *
 * Doctrine notes:
 *  - "Quiet states are valid." Loading and empty render NOTHING — no
 *    section header, no "No beacons" placeholder. Stale must not look live.
 *  - "No exact tracking." We only surface what the beacon row itself
 *    already exposes (title, category, coords, ends_at). No analytics
 *    pings, no derived locations.
 *  - Beacon Identity palette: gold (#C8962C) for venue-state categories,
 *    care cream (#F4F1E8) for clinic/aftercare.
 *
 * Props:
 *   userId — the viewed user's id. We query owner_id = userId. Caller is
 *            expected to pass auth_user_id when available
 *            (profileUser.auth_user_id || profileUser.id).
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

type Beacon = {
  id: string;
  code: string | null;
  type: string | null;
  beacon_category: string | null;
  owner_id: string;
  geo_lat: number | null;
  geo_lng: number | null;
  starts_at: string | null;
  ends_at: string;
  intensity: number | null;
  status: string | null;
  active: boolean | null;
  title: string | null;
  description: string | null;
};

// Beacon Identity System: care categories render in soft cream; everything
// else falls back to HOTMESS gold. Keep the palette tight — see
// docs/beacon-identity-system.md and components/globe/beaconGlyphs.ts.
const CARE_CATEGORIES = new Set(['clinic', 'aftercare', 'care', 'recovery']);

function categoryColor(category: string | null | undefined): string {
  const c = (category || '').toLowerCase();
  if (CARE_CATEGORIES.has(c)) return '#F4F1E8';
  return '#C8962C';
}

function categoryLabel(category: string | null | undefined, type: string | null | undefined): string {
  const c = (category || type || '').toString();
  if (!c) return '';
  return c.toUpperCase();
}

function expiresIn(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `expires in ${m}m`;
  return `expires in ${h}h ${m}m`;
}

interface Props {
  userId: string | null;
}

export default function ProfileBeaconsSection({ userId }: Props) {
  const navigate = useNavigate();
  const { closeSheet } = useSheet();
  const [beacons, setBeacons] = useState<Beacon[] | null>(null);

  const fetchBeacons = useCallback(async () => {
    if (!userId) return;
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('beacons')
        .select('id, code, type, beacon_category, owner_id, geo_lat, geo_lng, starts_at, ends_at, intensity, status, active, title, description')
        .eq('owner_id', userId)
        .eq('active', true)
        .gt('ends_at', nowIso)
        .order('ends_at', { ascending: true });
      if (error) {
        // Quiet failure — render nothing, never fake a section header.
        setBeacons([]);
        return;
      }
      setBeacons(Array.isArray(data) ? (data as Beacon[]) : []);
    } catch {
      setBeacons([]);
    }
  }, [userId]);

  useEffect(() => {
    setBeacons(null);
    fetchBeacons();
    // Soft refresh every 60s — beacons expire, and we don't want a stale
    // row to look live. Sacred invariant #4.
    const t = setInterval(fetchBeacons, 60_000);
    return () => clearInterval(t);
  }, [fetchBeacons]);

  // Render nothing while loading or empty. "Quiet states are valid."
  if (!userId) return null;
  if (beacons === null) return null;
  const active = beacons.filter(
    (b) => Number.isFinite(b.geo_lat) && Number.isFinite(b.geo_lng),
  );
  if (active.length === 0) return null;

  const handleTap = (b: Beacon) => {
    if (!Number.isFinite(b.geo_lat) || !Number.isFinite(b.geo_lng)) return;
    try { closeSheet(); } catch { /* non-fatal */ }
    navigate('/pulse');
    // Give the route a beat to mount the map before the flyto fires.
    // (Pattern verified in Globe.jsx pulse:flyto listener.)
    setTimeout(() => {
      try {
        window.dispatchEvent(
          new CustomEvent('pulse:flyto', {
            detail: { lat: b.geo_lat as number, lng: b.geo_lng as number, zoom: 16 },
          }),
        );
      } catch { /* non-fatal */ }
    }, 250);
  };

  return (
    <div className="px-4 pt-3 pb-2">
      <h3
        className="mb-2"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '10px',
          letterSpacing: '0.28em',
          color: 'rgba(200,150,44,0.7)',
          textTransform: 'uppercase',
        }}
      >
        ACTIVE BEACONS
      </h3>
      <div className="flex flex-col gap-1.5">
        {active.map((b) => {
          const color = categoryColor(b.beacon_category);
          const label = categoryLabel(b.beacon_category, b.type);
          const sub = expiresIn(b.ends_at);
          const title = (b.title || label || 'Beacon').trim();
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => handleTap(b)}
              className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 bg-white/5 hover:bg-white/8 active:bg-white/10 border border-white/8 transition-colors"
              aria-label={`Find ${title} on the map`}
            >
              <span
                aria-hidden="true"
                className="shrink-0 rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: color,
                  boxShadow: `0 0 8px ${color}55`,
                }}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-white truncate">{title}</span>
                <span className="block text-[11px] text-white/45 truncate">
                  {label}
                  {label && sub ? ' · ' : ''}
                  {sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
