/**
 * src/components/home/PulseModeWidget.tsx — Chunk 15
 *
 * City dashboard — visual output of all five Sound of the Night systems.
 * Flag-gated: v6_sound_of_the_night
 *
 * Reads (no writes):
 *   - night_pulse_realtime  → city heat score + live count + event spikes + drop badge
 *   - radio_signals         → WAVE animation (fresh signals only)
 *   - beacons               → event spike bars (active + ends_at > now)
 *
 * Spec: HOTMESS-SoundOfTheNight-LOCKED.docx §6 + §9B / §9D
 *
 * Props:
 *   city        — city slug to display (default: 'london')
 *   className   — optional wrapper class
 */

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useV6Flag } from '@/hooks/useV6Flag';
import {
  type NightPulseData,
  type CityPhase,
  derivePhase,
  PHASE_LABEL,
  isNightPulseFresh,
  isRadioSignalFresh,
} from '@/lib/soundOfNight';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventSpike {
  id:        string;
  title:     string;
  intensity: number; // 0-1 normalised for bar height
}

interface RadioWaveState {
  active:    boolean;
  intensity: number; // max intensity for animation speed
}

// ── Refresh interval ──────────────────────────────────────────────────────────
const REFRESH_MS = 30_000; // re-query every 30s (matview refreshes every 5m)

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  city?:      string;
  className?: string;
}

export default function PulseModeWidget({ city = 'london', className = '' }: Props) {
  const flagOn = useV6Flag('v6_sound_of_the_night');

  const [pulse,       setPulse]       = useState<NightPulseData | null>(null);
  const [radioWave,   setRadioWave]   = useState<RadioWaveState>({ active: false, intensity: 0 });
  const [eventSpikes, setEventSpikes] = useState<EventSpike[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [phase,       setPhase]       = useState<CityPhase>('QUIET');

  const fetchData = useCallback(async () => {
    if (!flagOn) return;

    try {
      // 1. night_pulse_realtime — city heat
      const { data: pulseRows } = await supabase
        .from('night_pulse_realtime')
        .select('*')
        .eq('city', city)
        .maybeSingle();

      if (pulseRows) {
        // §9B: stale matview → SPARKLE fallback only
        const fresh = isNightPulseFresh(pulseRows.refreshed_at);
        const safePulse: NightPulseData = fresh
          ? pulseRows
          : { ...pulseRows, heat_score: 0, live_count: 0, event_spike_count: 0 };
        setPulse(safePulse);
        setPhase(derivePhase(safePulse.heat_score));
      }

      // 2. radio_signals — WAVE animation
      const { data: radioRows } = await supabase
        .from('radio_signals')
        .select('intensity, expires_at')
        .eq('city', city)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      const freshRadio = (radioRows ?? []).filter(r => isRadioSignalFresh(r.expires_at));
      if (freshRadio.length > 0) {
        const maxIntensity = Math.max(...freshRadio.map(r => r.intensity ?? 1));
        setRadioWave({ active: true, intensity: maxIntensity });
      } else {
        setRadioWave({ active: false, intensity: 0 });
      }

      // 3. beacons — event spikes
      const { data: beaconRows } = await supabase
        .from('beacons')
        .select('id, title, intensity')
        .eq('active', true)
        .eq('beacon_category', 'event')
        .eq('city', city)
        .gt('ends_at', new Date().toISOString())
        .order('intensity', { ascending: false })
        .limit(6);

      if (beaconRows && beaconRows.length > 0) {
        const maxI = Math.max(...beaconRows.map(b => b.intensity ?? 1));
        setEventSpikes(beaconRows.map(b => ({
          id:        b.id,
          title:     b.title ?? '',
          intensity: maxI > 0 ? (b.intensity ?? 1) / maxI : 0.5,
        })));
      } else {
        setEventSpikes([]);
      }
    } catch {
      // Best-effort — never crash HomeMode
    } finally {
      setLoading(false);
    }
  }, [flagOn, city]);

  useEffect(() => {
    if (!flagOn) return;
    fetchData();
    const interval = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(interval);
  }, [flagOn, fetchData]);

  // Flag OFF or loading with no data → nothing
  if (!flagOn) return null;
  if (loading && !pulse) return null;

  const liveCount     = pulse?.live_count ?? 0;
  const heatScore     = pulse?.heat_score ?? 0;
  const dropActive    = pulse?.drop_active ?? false;

  // §9D: no synthetic energy — silent empty state if truly quiet
  const hasAnything = heatScore > 0 || radioWave.active || eventSpikes.length > 0 || liveCount > 0;
  if (!hasAnything) return null;

  // Animation speed tied to radio intensity (faster = more intense)
  const waveSpeed = radioWave.active
    ? Math.max(0.6, 2.0 - (radioWave.intensity - 1) * 0.5)
    : 2.0;

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'rgba(5,5,7,0.92)',
        border:          '1px solid rgba(200,150,44,0.2)',
        borderRadius:    '12px',
        padding:         '12px 16px',
        backdropFilter:  'blur(12px)',
      }}
    >
      {/* Header row: city label + phase + live count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            color:       '#C8962C',
            fontSize:    11,
            fontFamily:  'Oswald, sans-serif',
            fontWeight:  700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {city.toUpperCase()}
          </span>
          <span style={{
            color:      'rgba(255,255,255,0.35)',
            fontSize:   11,
            fontFamily: 'Oswald, sans-serif',
          }}>
            {PHASE_LABEL[phase]}
          </span>
        </div>

        {/* Live count — §9D: never show if 0 */}
        {liveCount > 0 && (
          <span style={{
            color:      'rgba(255,255,255,0.6)',
            fontSize:   11,
            fontFamily: 'Oswald, sans-serif',
          }}>
            {liveCount} live
          </span>
        )}
      </div>

      {/* Heat bar */}
      <div style={{
        position:        'relative',
        height:          4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius:    2,
        marginBottom:    10,
        overflow:        'hidden',
      }}>
        <div style={{
          position:        'absolute',
          left:            0,
          top:             0,
          height:          '100%',
          width:           `${heatScore}%`,
          background:      heatScore > 65
            ? 'linear-gradient(90deg, #C8962C, #FFB84D)'
            : 'rgba(200,150,44,0.7)',
          borderRadius:    2,
          transition:      'width 1s ease',
        }} />
      </div>

      {/* Radio WAVE + event spikes row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 28 }}>

        {/* Radio WAVE — animated bars when active */}
        {radioWave.active && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginRight: 6 }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                style={{
                  width:           3,
                  backgroundColor: '#C8962C',
                  borderRadius:    1,
                  animation:       `soundbar ${waveSpeed}s ease-in-out infinite`,
                  animationDelay:  `${i * 0.15}s`,
                  // Heights driven by CSS animation
                  height:          8 + i * 4,
                  opacity:         0.6 + i * 0.1,
                }}
              />
            ))}
          </div>
        )}

        {/* Event spikes — one bar per active event */}
        {eventSpikes.map(spike => (
          <div
            key={spike.id}
            title={spike.title}
            style={{
              width:           6,
              height:          Math.max(8, Math.round(spike.intensity * 28)),
              backgroundColor: 'rgba(200,150,44,0.5)',
              borderRadius:    2,
              flexShrink:      0,
            }}
          />
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* DROP badge — §9D: only if beacon not expired */}
        {dropActive && (
          <span style={{
            color:        '#C8962C',
            fontSize:     9,
            fontFamily:   'Oswald, sans-serif',
            fontWeight:   700,
            letterSpacing: '0.1em',
            border:       '1px solid rgba(200,150,44,0.4)',
            borderRadius: 4,
            padding:      '1px 5px',
          }}>
            DROP
          </span>
        )}
      </div>

      {/* Soundbar keyframe — injected inline once */}
      <style>{`
        @keyframes soundbar {
          0%, 100% { transform: scaleY(0.4); }
          50%       { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  );
}
