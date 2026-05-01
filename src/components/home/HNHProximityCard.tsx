/**
 * src/components/home/HNHProximityCard.tsx — Chunk 16
 *
 * HomeMode signal-line card: "Need lube?"
 * Appears when user is at a known London venue AND HNH stock > 0 in city.
 *
 * Flag-gated: v6_hnh_mess_gtm
 *
 * Spec: HOTMESS-HNHMess-GTM-LOCKED.docx Channel 3
 * Signal priority 6 (MARKET_DROP) — lowest, never displaces safety/meet/social signals.
 *
 * Props:
 *   venueName   — from right_now_status.venue_name (caller provides)
 *   onShopTap   — callback to open checkout/market
 *   className   — optional wrapper class
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useV6Flag } from '@/hooks/useV6Flag';

// ── Config ────────────────────────────────────────────────────────────────────

// London venue slugs that trigger the card (must be in venues table)
const LONDON_VENUE_SLUGS = [
  'eagle-london',
  'vauxhall-tavern',
  'ku-bar',
  'heaven-nightclub',
  'the-glory',
  'dalston-superstore',
  'adonis-london',
];

const HNH_PRODUCT_KEY = 'hnh-mess';
const GOLD = '#C8962C';

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  venueName?: string | null;
  onShopTap:  () => void;
  className?: string;
}

export default function HNHProximityCard({ venueName, onShopTap, className = '' }: Props) {
  const flagOn = useV6Flag('v6_hnh_mess_gtm');
  const [hasStock, setHasStock]   = useState(false);
  const [beaconId, setBeaconId]   = useState<string | null>(null);
  const [venueId,  setVenueId]    = useState<string | null>(null);
  const [checked,  setChecked]    = useState(false);

  useEffect(() => {
    if (!flagOn || !venueName) { setChecked(true); return; }

    async function checkStockAndVenue() {
      try {
        // 1. Resolve venue record from name or slug match
        const { data: venue } = await supabase
          .from('venues')
          .select('id, slug')
          .or(`name.ilike.%${venueName}%,slug.ilike.%${venueName?.toLowerCase().replace(/\s+/g, '-')}%`)
          .limit(1)
          .maybeSingle();

        if (!venue) { setChecked(true); return; }

        // Only trigger for London target venues
        const isTarget = LONDON_VENUE_SLUGS.some(s =>
          venue.slug?.includes(s) || s.includes(venue.slug)
        );
        if (!isTarget) { setChecked(true); return; }

        setVenueId(venue.id);

        // 2. Check for active MARKET beacon at this venue (stock indicator)
        const { data: beacon } = await supabase
          .from('beacons')
          .select('id')
          .eq('venue_id', venue.id)
          .eq('active', true)
          .eq('beacon_category', 'system')
          .gt('ends_at', new Date().toISOString())
          .limit(1)
          .maybeSingle();

        setBeaconId(beacon?.id ?? null);
        setHasStock(!!beacon); // beacon presence = stock confirmed in venue tonight
      } catch {
        // best-effort
      } finally {
        setChecked(true);
      }
    }

    checkStockAndVenue();
  }, [flagOn, venueName]);

  // §9D-equivalent: never show if stock not confirmed
  if (!flagOn || !checked || !hasStock) return null;

  return (
    <button
      onClick={onShopTap}
      data-hnh-venue-id={venueId ?? undefined}
      data-hnh-beacon-id={beaconId ?? undefined}
      className={`w-full flex items-center gap-3 text-left active:opacity-70 transition-opacity ${className}`}
      style={{
        padding:         '10px 16px',
        background:      'linear-gradient(90deg, #0D0800 0%, #1A1000 100%)',
        border:          `1px solid ${GOLD}30`,
        borderRadius:    10,
      }}
    >
      {/* Gold dot signal indicator */}
      <div style={{
        width:           8,
        height:          8,
        borderRadius:    '50%',
        backgroundColor: GOLD,
        flexShrink:      0,
        boxShadow:       `0 0 6px ${GOLD}`,
      }} />

      {/* Copy */}
      <div className="flex-1 min-w-0">
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, margin: 0 }}>
          Need lube?
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '1px 0 0' }}>
          HNH MESS at the bar tonight
        </p>
      </div>

      {/* CTA badge */}
      <span style={{
        flexShrink:      0,
        fontSize:        10,
        fontWeight:      700,
        fontFamily:      'Oswald, sans-serif',
        letterSpacing:   '0.08em',
        textTransform:   'uppercase',
        padding:         '3px 8px',
        borderRadius:    6,
        backgroundColor: `${GOLD}20`,
        border:          `1px solid ${GOLD}50`,
        color:           GOLD,
      }}>
        Shop
      </span>
    </button>
  );
}
