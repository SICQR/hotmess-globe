/**
 * L2CruisingAreaSheet
 *
 * Slide-up drawer card for cruising_area places (outdoor zones).
 * Receives `place` from sheet props — a PulsePlace row with area_metadata.
 * Renders: vibe intro, what to expect, best times, season, safety,
 *          transport, entry points, nearby. No action buttons (no booking).
 */

import React from 'react';
import { MapPin, Clock, AlertTriangle, Navigation, Train, Compass } from 'lucide-react';

const PURPLE = '#7B2D8B';
const GOLD   = '#C8962C';
const MUTED  = 'rgba(255,255,255,0.38)';
const TEXT   = 'rgba(255,255,255,0.88)';

interface AreaMeta {
  peak_times?: {
    days?: string[];
    hours?: string;
    secondary?: string;
    notes?: string;
  };
  season?: string;
  vibe?: string;
  what_to_expect?: string;
  safety?: string;
  transport?: string[];
  nearby?: string;
  entry_points?: string[];
  community_tips?: string[];
}

interface Props {
  place: {
    id: string;
    slug: string;
    name: string;
    lat: number;
    lng: number;
    area_metadata?: AreaMeta | Record<string, unknown> | null;
    beacon_category?: string | null;
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-1.5" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function Section({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span style={{ color: MUTED }}>{icon}</span>}
        <SectionLabel>{label}</SectionLabel>
      </div>
      {children}
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: TEXT }}>
      {children}
    </p>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mr-2 mb-1"
      style={{ background: `${PURPLE}33`, color: PURPLE, border: `1px solid ${PURPLE}55` }}
    >
      {children}
    </span>
  );
}

export default function L2CruisingAreaSheet({ place }: Props) {
  if (!place) return null;

  const meta = (place.area_metadata || {}) as AreaMeta;
  const peak = meta.peak_times || {};

  const handleDirections = () => {
    const url = `https://maps.google.com/?q=${place.lat},${place.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-8" style={{ background: 'transparent' }}>

      {/* Header */}
      <div className="px-5 pt-2 pb-4">
        {/* Type pill */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
            style={{ background: PURPLE, color: '#fff' }}
          >
            Cruising Area
          </span>
        </div>
        {/* Name */}
        <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none mb-1">
          {place.name}
        </h2>
        {/* Directions CTA */}
        <button
          onClick={handleDirections}
          className="flex items-center gap-1.5 mt-2 text-[11px] font-bold uppercase tracking-wider active:opacity-70"
          style={{ color: GOLD }}
        >
          <Navigation className="w-3.5 h-3.5" />
          Get directions
        </button>
      </div>

      {/* Divider */}
      <div className="mx-5 mb-5" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* Body */}
      <div className="px-5">

        {/* Vibe — runs as intro, no section label */}
        {meta.vibe && (
          <p className="text-sm leading-relaxed mb-5 italic" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {meta.vibe}
          </p>
        )}

        {/* What to expect */}
        {meta.what_to_expect && (
          <Section label="What to expect" icon={<Compass className="w-3 h-3" />}>
            <Body>{meta.what_to_expect}</Body>
          </Section>
        )}

        {/* Best times */}
        {(peak.days?.length || peak.hours) && (
          <Section label="Best times" icon={<Clock className="w-3 h-3" />}>
            {peak.days && peak.days.length > 0 && (
              <div className="mb-1.5">
                {peak.days.map(d => <Pill key={d}>{d}</Pill>)}
              </div>
            )}
            {peak.hours && <Body>{peak.hours}</Body>}
            {peak.secondary && (
              <p className="text-xs mt-1" style={{ color: MUTED }}>{peak.secondary}</p>
            )}
            {peak.notes && (
              <p className="text-xs mt-1.5 italic" style={{ color: MUTED }}>{peak.notes}</p>
            )}
          </Section>
        )}

        {/* Season */}
        {meta.season && (
          <Section label="Season">
            <Body>{meta.season}</Body>
          </Section>
        )}

        {/* Safety */}
        {meta.safety && (
          <Section label="Safety" icon={<AlertTriangle className="w-3 h-3" />}>
            <Body>{meta.safety}</Body>
          </Section>
        )}

        {/* Transport */}
        {meta.transport && meta.transport.length > 0 && (
          <Section label="Getting there" icon={<Train className="w-3 h-3" />}>
            <ul className="space-y-1">
              {meta.transport.map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: GOLD }} />
                  <span className="text-sm" style={{ color: TEXT }}>{t}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Entry points */}
        {meta.entry_points && meta.entry_points.length > 0 && (
          <Section label="Entry points" icon={<MapPin className="w-3 h-3" />}>
            <ul className="space-y-1">
              {meta.entry_points.map((ep, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: PURPLE }} />
                  <span className="text-sm" style={{ color: TEXT }}>{ep}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Nearby */}
        {meta.nearby && (
          <Section label="Nearby">
            <Body>{meta.nearby}</Body>
          </Section>
        )}

        {/* Community tips — only if populated */}
        {meta.community_tips && meta.community_tips.length > 0 && (
          <Section label="Community tips">
            <ul className="space-y-2">
              {meta.community_tips.map((tip, i) => (
                <li key={i} className="text-sm" style={{ color: TEXT }}>"{tip}"</li>
              ))}
            </ul>
          </Section>
        )}

      </div>
    </div>
  );
}
