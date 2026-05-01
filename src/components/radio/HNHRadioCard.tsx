/**
 * src/components/radio/HNHRadioCard.tsx — Chunk 16
 *
 * HNH MESS sponsorship card in RadioMode — shown during Dial-A-Daddy show.
 * Flag-gated: v6_hnh_mess_gtm
 *
 * Spec: HOTMESS-HNHMess-GTM-LOCKED.docx Channel 4
 * Copy: "Daddy's listening. Be prepared."
 * CTA: direct Stripe checkout (radio attribution source)
 *
 * Props:
 *   showName   — current show name (from RadioContext.currentShowName)
 *   radioShowId — UUID of the active radio show (for attribution)
 *   onShopTap  — open HNH checkout (caller passes source='radio', radio_show_id)
 */

import React from 'react';
import { useV6Flag } from '@/hooks/useV6Flag';

// Show name patterns that trigger the card
const HNH_SPONSORED_SHOWS = ['dial-a-daddy', 'dial a daddy', 'dialadaddy'];

const GOLD    = '#C8962C';
const BOTTLE  = 'https://cdn.shopify.com/s/files/1/0629/2497/4961/files/hnh-mess-50ml.png';

interface Props {
  showName?:   string;
  radioShowId?: string | null;
  onShopTap:   (radioShowId: string | null) => void;
  className?:  string;
}

export default function HNHRadioCard({ showName, radioShowId, onShopTap, className = '' }: Props) {
  const flagOn = useV6Flag('v6_hnh_mess_gtm');

  if (!flagOn) return null;
  if (!showName) return null;

  const isSponsored = HNH_SPONSORED_SHOWS.some(s =>
    showName.toLowerCase().includes(s)
  );
  if (!isSponsored) return null;

  return (
    <div
      className={`w-full ${className}`}
      style={{
        background:   'linear-gradient(135deg, #0A0800 0%, #150F00 100%)',
        border:       `1px solid ${GOLD}25`,
        borderRadius: 10,
        padding:      '12px 14px',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
      }}
    >
      {/* Bottle image */}
      <img
        src={BOTTLE}
        alt="HNH MESS"
        style={{ width: 44, height: 54, objectFit: 'contain', flexShrink: 0 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />

      {/* Copy */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color:        GOLD,
          fontSize:     9,
          fontFamily:   'Oswald, sans-serif',
          fontWeight:   700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          margin:       '0 0 3px',
        }}>
          Sponsored
        </p>
        <p style={{
          color:      'rgba(255,255,255,0.85)',
          fontSize:   14,
          fontWeight: 600,
          margin:     '0 0 2px',
          fontFamily: 'Oswald, sans-serif',
        }}>
          HNH MESS
        </p>
        <p style={{
          color:    'rgba(255,255,255,0.45)',
          fontSize: 12,
          margin:   0,
        }}>
          Daddy&apos;s listening. Be prepared.
        </p>
      </div>

      {/* Shop CTA */}
      <button
        onClick={() => onShopTap(radioShowId ?? null)}
        style={{
          flexShrink:      0,
          padding:         '8px 14px',
          borderRadius:    8,
          backgroundColor: `${GOLD}18`,
          border:          `1px solid ${GOLD}50`,
          color:           GOLD,
          fontSize:        12,
          fontFamily:      'Oswald, sans-serif',
          fontWeight:      700,
          letterSpacing:   '0.06em',
          textTransform:   'uppercase',
          cursor:          'pointer',
        }}
      >
        Shop
      </button>
    </div>
  );
}
