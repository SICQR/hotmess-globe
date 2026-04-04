/**
 * ChatMapCard
 * Embeddable map card for location-type messages in chat threads.
 *
 * Props:
 *   label     — place name, e.g. "Soho Cluster"
 *   distance  — human-readable string, e.g. "720 m · 4 min"
 *   mapImageUrl — static map thumbnail URL (falls back to dark placeholder)
 *   lat       — decimal latitude  (for Uber deeplink)
 *   lng       — decimal longitude (for Uber deeplink)
 *   address   — plain text address (for share / directions)
 */

import { motion } from 'framer-motion';
import { MapPin, Navigation, Share2 } from 'lucide-react';

const AMBER = '#C8962C';

// Uber deeplink helper
function uberDeeplink(lat, lng, label) {
  if (!lat || !lng) return 'https://m.uber.com/ul/';
  const params = new URLSearchParams({
    action: 'setPickup',
    'pickup[latitude]': String(lat),
    'pickup[longitude]': String(lng),
    'pickup[nickname]': label || 'Meet-up Point',
    'dropoff[latitude]': String(lat),
    'dropoff[longitude]': String(lng),
    'dropoff[nickname]': label || 'Meet-up Point',
  });
  return `uber://?${params.toString()}`;
}

function handleShare(label, address) {
  if (!label && !address) return;
  const text = [label, address].filter(Boolean).join(' · ');
  if (navigator.share) {
    navigator.share({ title: 'HOTMESS Meet-up', text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).catch(() => {});
  }
}

export default function ChatMapCard({
  label = 'Meet-up Point',
  distance,
  mapImageUrl,
  lat,
  lng,
  address,
}) {
  const uberUrl = uberDeeplink(lat, lng, label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="rounded-2xl overflow-hidden w-full"
      style={{
        background: '#1C1C1E',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
      }}
      role="region"
      aria-label={`Map: ${label}`}
    >
      {/* Map thumbnail */}
      <div
        className="relative w-full h-36 flex items-center justify-center"
        style={{
          backgroundImage: mapImageUrl ? `url(${mapImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          background: mapImageUrl
            ? undefined
            : 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0D0D0D 100%)',
        }}
      >
        {/* Gold pin */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: `${AMBER}22`, border: `2px solid ${AMBER}` }}
          aria-hidden="true"
        >
          <MapPin className="w-5 h-5" style={{ color: AMBER }} />
        </div>

        {/* Subtle grid overlay to read as a map when no image */}
        {!mapImageUrl && (
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#C8962C" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}
      </div>

      {/* Info + actions */}
      <div className="px-3 py-3 space-y-2.5">
        <div>
          <p className="text-white font-bold text-sm leading-tight">{label}</p>
          {distance && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#8E8E93' }}>
              <MapPin className="w-3 h-3" />
              {distance}
            </p>
          )}
          {address && !distance && (
            <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }} title={address}>
              {address}
            </p>
          )}
        </div>

        {/* CTA row */}
        <div className="flex gap-2">
          {/* Start (native directions) */}
          <a
            href={
              lat && lng
                ? `https://maps.google.com/?daddr=${lat},${lng}`
                : '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold active:scale-[0.97] transition-transform"
            style={{ background: AMBER, color: '#000' }}
            aria-label="Get directions"
          >
            <Navigation className="w-3.5 h-3.5" />
            Start
          </a>

          {/* Uber */}
          <a
            href={uberUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold active:scale-[0.97] transition-transform"
            style={{
              background: 'transparent',
              border: `1px solid ${AMBER}50`,
              color: AMBER,
            }}
            aria-label="Open in Uber"
          >
            {/* Uber wordmark — plain text fallback (no FA icon dependency) */}
            <span className="font-black tracking-tight text-sm">U</span>
            Uber
          </a>

          {/* Share */}
          <button
            onClick={() => handleShare(label, address)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold active:scale-[0.97] transition-transform"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)',
            }}
            aria-label="Share location"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    </motion.div>
  );
}
