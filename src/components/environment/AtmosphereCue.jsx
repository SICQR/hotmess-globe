import React from 'react';
import { Sun, Moon, Sunrise, Sunset } from 'lucide-react';

// Weather/Time + Emotional Rendering — the ambient atmosphere cue.
// docs/GLOBE_WEATHER_TIME_AND_ENVIRONMENTAL_RENDERING_SYSTEM.md (daylight phase) +
// docs/GLOBE_EMOTIONAL_RENDERING_AND_NIGHTLIFE_PSYCHOLOGY.md (night-phase tone).
//
// Time is the only ambient signal we actually hold right now — there's no weather
// feed and no district-emotion table yet — so the cue is derived purely from the
// local hour. Honest data, no empty surface. The map's atmospheric tint
// (environmentalFog, in mapboxLayerStack) is the *visual* half of this layer; this
// pill is the *readable* half. Real weather overlays + per-district emotional
// profiles slot in here once that data exists (build it when the data exists).
//
// Surfaced only in local mode — the parent gates it on localFocus, so it appears on
// dive-in and clears on pull-back to the globe. Ambient + non-dismissible, like the
// online pill it sits beneath.

// hour → daylight phase (WEATHER.md) + night-phase emotional tone (EMOTION.md)
export function atmosphereForHour(hour) {
  const h = Number.isFinite(hour) ? hour : 22;
  if (h >= 5 && h < 8)   return { Icon: Sunrise, phase: 'Sunrise',    tone: 'the comedown',            accent: '#caa15a' };
  if (h >= 8 && h < 12)  return { Icon: Sun,     phase: 'Morning',    tone: 'the city resting',        accent: '#9fb6cc' };
  if (h >= 12 && h < 17) return { Icon: Sun,     phase: 'Afternoon',  tone: 'a slow build',            accent: '#9fb6cc' };
  if (h >= 17 && h < 20) return { Icon: Sunset,  phase: 'Dusk',       tone: 'anticipation rising',     accent: '#c8762c' };
  if (h >= 20 && h < 23) return { Icon: Moon,    phase: 'Night',      tone: 'the night opens up',      accent: '#C8962C' };
  if (h >= 23 || h < 2)  return { Icon: Moon,    phase: 'Late night', tone: 'compression & intensity', accent: '#C8962C' };
  return { Icon: Moon, phase: '2AM drift', tone: 'the emotional peak', accent: '#C8962C' }; // 2–5
}

export default function AtmosphereCue() {
  const a = atmosphereForHour(new Date().getHours());
  const Icon = a.Icon;
  return (
    <div
      className="absolute top-[calc(92px+env(safe-area-inset-top,0px))] left-4 z-30 pointer-events-none"
      data-pull-refresh-ignore
    >
      <div className="px-3 py-1.5 bg-black/60 border border-white/20 backdrop-blur-md rounded-full flex items-center gap-2 pointer-events-auto shadow-lg max-w-[78vw]">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: a.accent }} />
        <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{a.phase}</span>
        <span className="text-[10px] text-white/40">·</span>
        <span className="text-[10px] text-white/65 tracking-wide truncate">{a.tone}</span>
      </div>
    </div>
  );
}
