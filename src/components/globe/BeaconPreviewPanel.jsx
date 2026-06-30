import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { MapPin, HeartHandshake, UserCircle2 } from 'lucide-react';
import { createPageUrl } from '../../utils';
import { ProximityRow } from '@/components/ui/ProximityRow';
import { useGPS } from '@/hooks/useGPS';

export default function BeaconPreviewPanel({ beacon, onClose, onViewFull, onViewProfile }) {
  const navigate = useNavigate();
  const { position: viewerPos } = useGPS();
  if (!beacon) return null;

  const isPerson = beacon.kind === 'person';
  const isRecovery = beacon.kind === 'recovery' || beacon.beacon_category === 'recovery';
  // D49 §6 — venue is passive geography, not a signal or a person. Suppress
  // person-routing CTAs (View Profile) even if owner_id is present (a venue
  // can be claimed by an operator account without the peek becoming a profile
  // surface). Header label reflects ontology, not stored kind.
  const isVenue = beacon.entity_kind === 'venue';
  const isUserBeacon =
    !isVenue && (
      isPerson ||
      beacon.beacon_category === 'user' ||
      Boolean(beacon.user_id || beacon.owner_id)
    );
  const detailsUrl = isPerson && beacon.email
    ? createPageUrl(`Profile?email=${encodeURIComponent(beacon.email)}`)
    : createPageUrl('BeaconDetail') + '?id=' + encodeURIComponent(beacon.id);

  return (
    <AnimatePresence>
      <motion.div
        key="beacon-preview-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.y > 100 || velocity.y > 500) onClose();
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed left-0 right-0 z-[200] bg-[#0A0A0A]/95 backdrop-blur-md border-t border-white/10 rounded-t-2xl px-4 pt-3 pb-3 shadow-[0_-12px_30px_rgba(0,0,0,0.6)] touch-none"
        style={{
          height: 'auto',
          maxHeight: '70dvh',
          overflowY: 'auto',
          // 2026-05-27 Phil — lift above the FAB cluster (z-150) + rail (z-30) +
          // beacon-drop button (z-40) + bottom nav. Was full-width sheet covering
          // everything. Now a floating card that sits just above the FAB zone so
          // the user can still see online indicator, drop beacons, use the rail.
          bottom: 'calc(var(--mobile-nav-height, 72px) + env(safe-area-inset-bottom, 0px))',
          maxWidth: 'min(420px, calc(100vw - 16px))',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {/* Phil 2026-06-14: partner event poster — shown above drag handle when set */}
        {beacon.metadata?.poster_url && (
          <div className="relative w-full rounded-t-2xl overflow-hidden" style={{ aspectRatio: '16/7' }}>
            <img
              src={beacon.metadata.poster_url}
              alt={beacon.title || 'Event'}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.8) 0%, transparent 60%)' }}
            />
          </div>
        )}
        {/* Drag Handle */}
        <div className="flex justify-center py-1.5">
          <div className="w-10 h-1 bg-white/10 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              {beacon.metadata?.poster_url
                ? <img src={beacon.metadata.poster_url} alt="" className="w-full h-full object-cover" />
                : <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: isRecovery ? 'rgba(255,255,255,0.10)' : 'rgba(200,150,44,0.10)' }}
                  >
                    {isRecovery
                      ? <HeartHandshake className="w-5 h-5 text-white" />
                      : <MapPin className={`w-5 h-5 ${isPerson ? 'text-[#00C2E0]' : isVenue ? 'text-white/70' : 'text-[#C8962C]'}`} />}
                  </div>
              }
            </div>
            <div>
              <h3 className="text-xl font-black italic tracking-tight text-white uppercase leading-none">
                {beacon.title}
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest mt-1"
                 style={{ color: isRecovery ? '#FFFFFF99' : '#FFFFFF4D' }}
              >
                {isRecovery ? 'recovery support' : isVenue ? 'venue' : isPerson ? 'person' : beacon.kind || 'SIGNAL'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 overflow-y-auto max-h-[60dvh] pointer-events-auto pb-12">
          {(beacon.description || beacon.metadata?.description) && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
              <p className="text-white/70 text-sm leading-relaxed font-medium">
                {beacon.description || beacon.metadata?.description}
              </p>
            </div>
          )}


          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 gap-3">
            {(beacon.city || beacon.metadata?.city) && (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10">
                <MapPin className="w-5 h-5 text-white/40" />
                <span className="text-white font-black uppercase tracking-wider text-xs">
                  {beacon.city || beacon.metadata?.city}
                </span>
              </div>
            )}

            {(() => {
              // Prefer a human-readable address. Never render raw lat/lng or a
              // WKB/PostGIS hex string (e.g. "0101000020E6100000...") to the user.
              const raw =
                beacon.address ||
                beacon.metadata?.address ||
                beacon.location_name ||
                beacon.metadata?.location_name ||
                beacon.notes ||
                beacon.metadata?.notes;
              const readable =
                typeof raw === "string" && raw.trim() && !/^[0-9A-Fa-f]{20,}$/.test(raw.trim())
                  ? raw.trim()
                  : null;
              if (!readable) return null;
              return (
                <div className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10">
                  <MapPin className="w-5 h-5 text-[#00C2E0]" />
                  <span className="text-white font-bold text-sm uppercase tracking-tight">
                    {readable}
                  </span>
                </div>
              );
            })()}

            {/* Venue extras (Phil 2026-05-27): hours / website / phone if present.
                Render only what exists — graceful no-info state. */}
            {beacon.opening_hours && typeof beacon.opening_hours === 'object' && (
              (() => {
                const oh = beacon.opening_hours;
                const today = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
                let label = null;
                if (oh.always_open === true) label = 'OPEN 24/7';
                else if (oh.permanently_closed === true) label = 'PERMANENTLY CLOSED';
                else if (Array.isArray(oh[today]) && oh[today].length === 2) label = `TODAY ${oh[today][0]} – ${oh[today][1]}`;
                if (!label) return null;
                return (
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">HOURS</span>
                    <span className="text-white font-bold text-xs uppercase tracking-wider">{label}</span>
                  </div>
                );
              })()
            )}
            {beacon.website && typeof beacon.website === 'string' && (
              <a href={beacon.website} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">WEB</span>
                <span className="text-white font-semibold text-xs truncate">{beacon.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              </a>
            )}
            {beacon.phone && typeof beacon.phone === 'string' && (
              <a href={`tel:${beacon.phone}`}
                 className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">CALL</span>
                <span className="text-white font-semibold text-xs">{beacon.phone}</span>
              </a>
            )}

            {/* Proximity travel cues (Phil brief 2026-05-26). Renders nothing
                when viewer location is missing, stale (>2h), or >50km away. */}
            {(() => {
              const venueLat = Number(beacon.lat ?? beacon.location_lat ?? beacon.geo_lat);
              const venueLng = Number(beacon.lng ?? beacon.location_lng ?? beacon.geo_lng);
              if (!Number.isFinite(venueLat) || !Number.isFinite(venueLng)) return null;
              return (
                <ProximityRow
                  type="venue"
                  venueLat={venueLat}
                  venueLng={venueLng}
                  viewerLat={viewerPos?.lat ?? null}
                  viewerLng={viewerPos?.lng ?? null}
                  locationUpdatedAt={viewerPos?.timestamp ?? null}
                />
              );
            })()}

            <div className="flex flex-wrap gap-2 pt-2">
               {!isRecovery && beacon.isRightNow && (
                 <span className="px-3 py-1 bg-[#00C2E0]/20 border border-[#00C2E0]/30 text-[#00C2E0] text-[10px] font-black uppercase tracking-widest">Live Now</span>
               )}
               {!isRecovery && beacon.intensity > 0.7 && (
                 <span className="px-3 py-1 bg-[#FFEB3B]/20 border border-[#FFEB3B]/30 text-[#FFEB3B] text-[10px] font-black uppercase tracking-widest">High Energy</span>
               )}
               {isRecovery && (
                 <span className="px-3 py-1 bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest">Confidential</span>
               )}
            </div>

            {isRecovery && (
              <button
                onClick={() => {
                  onClose?.();
                  navigate('/care');
                }}
                className="w-full mt-2 py-3.5 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <HeartHandshake className="w-4 h-4" />
                Open Hand N Hand
              </button>
            )}

            {!isRecovery && isUserBeacon && onViewProfile && (
              <button
                onClick={() => onViewProfile(beacon)}
                className="w-full mt-2 py-3.5 bg-[#C8962C] text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <UserCircle2 className="w-4 h-4" />
                View Profile
              </button>
            )}

            {/* D49 §6 (Phil 2026-06-01) — venue escape hatch from peek tier.
                Tapping "Open" escalates from the peek panel to the L2 beacon
                sheet's venue branch (full venue card with directions, hours,
                etc.). Without this the venue peek is a dead-end. */}
            {isVenue && onViewFull && (
              <button
                onClick={onViewFull}
                className="w-full mt-2 py-3.5 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Open
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
