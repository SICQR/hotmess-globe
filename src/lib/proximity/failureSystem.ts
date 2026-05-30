/**
 * src/lib/proximity/failureSystem.ts — Chunk 14
 *
 * Signal quality monitor, state machine, haptic layer, language layer.
 * Spec: HOTMESS-ProximityFailureSystem.docx v1.0 FINAL §2–11
 *
 * Usage:
 *   import { ProximityFailureSystem, hapticFire } from '@/lib/proximity/failureSystem';
 *   const monitor = new ProximityFailureSystem(onStateChange);
 *   monitor.update(lat, lng);   // call on every GPS position
 *   monitor.setNoSignal();      // call when GPS/network lost
 *   monitor.destroy();          // clean up intervals
 */

// ── Types ─────────────────────��────────────────────────────────────────────────

export type SignalState = 'full' | 'reduced' | 'minimal' | 'presence';

export interface ProximityFailureState {
  state:          SignalState;
  showDots:       boolean;
  dotsOpacity:    number;       // 0–1
  showRoute:      boolean;
  routeOpacity:   number;       // 0–1
  showETA:        boolean;
  proximityText:  string | null;
  headerCopy:     string;
  hapticPattern:  number[] | null;
  hapticInterval: number | null; // ms
}

export interface GpsPoint {
  lat: number;
  lng: number;
  ts:  number; // Date.now()
}

// ── Haversine ──────────────��────────────────────────────────���──────────────────

function haversineM(a: GpsPoint, b: GpsPoint): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sin2 = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

function medianPoint(pts: GpsPoint[]): GpsPoint {
  const lats = pts.map(p => p.lat).sort((a, b) => a - b);
  const lngs = pts.map(p => p.lng).sort((a, b) => a - b);
  const mid  = Math.floor(pts.length / 2);
  return { lat: lats[mid], lng: lngs[mid], ts: Date.now() };
}

// ── Proximity text thresholds ─────────────────────────────────────────────────

export function proximityText(distanceM: number): string {
  if (distanceM < 30)  return 'Right here';
  if (distanceM < 100) return 'Very close';
  if (distanceM < 300) return 'Same area';
  return 'Nearby';
}

// ── Language layer — sealed copy per spec §3 ────────────────────────��─────────

export const DEGRADED_COPY = {
  reduced:          'Bit rough.',
  holdPosition:     'Stay there a second.',
  recovery:         null,  // silent — nothing shown
  restored:         'Got you again.',
  driftMinimal:     'Very close.',
  driftSame:        'Same area.',
  driftNearby:      'Nearby.',
  stall60:          'You paused.',
  stall70:          'They can see you\'re not moving.',
  mutualStall:      'Still happening?',
  meetPaused:       'Meet paused.',
  appRestored:      'Got you again.',
  appReturned30m:   'Were you still going?',
  microClose:       'Close.',
  microLookUp:      'Look up.',
  arrivalBanner:    'You\'re both here.',
  arrivalChat:      'Not seeing each other?',
  flashCooldown:    'Wait a second.',
  presence0:        'You\'re close.',
  presence60:       'Still close.',
  presence120:      'Stay where you are.',
  foundYou:         'I found you.',
} as const;

// ── Haptic patterns (ms durations) — §5 ──────────────────────────────────────

export const HAPTIC = {
  reducedAmbient:    [40] as number[],         // every 10s
  minimalAmbient:    [40] as number[],         // every 5s
  presenceAmbient:   [40, 40, 40] as number[], // every 3s
  drift:             [30, 90, 30, 60, 30] as number[],
  commit:            [50, 80, 150] as number[],
  proximity20m:      [80] as number[],
  proximity5m:       [40, 30, 40] as number[],
  arrival:           [80, 60, 80, 60, 80] as number[],
  foundEachOther:    [300] as number[],
  flashSent:         [200] as number[],
  flashExpiry:       [40, 60, 40] as number[],
  microConfusion:    [80, 120, 80] as number[],
} as const;

/**
 * hapticFire — ALL haptic calls route through this function.
 * Direct navigator.vibrate() in components is prohibited (spec §5).
 */
export function hapticFire(pattern: number[]): void {
  try {
    if (typeof window === 'undefined') return;
    if ('vibrate' in navigator) {
      // Interleave durations with pauses for multi-pulse patterns
      if (pattern.length === 1) {
        navigator.vibrate(pattern[0]);
      } else {
        // Build [vibrate, pause, vibrate, pause…] sequence
        const seq: number[] = [];
        pattern.forEach((dur, i) => {
          seq.push(dur);
          if (i < pattern.length - 1) seq.push(60); // 60ms gap between pulses
        });
        navigator.vibrate(seq);
      }
    }
  } catch { /* vibrate not supported — silent */ }
}

// ── State derivation ───────────────────────��──────────────────────────────���───

function deriveState(
  accuracy: number,    // metres
  ageSecs:  number,    // seconds since last GPS fix
  distM:    number | null, // last known haversine to target
): SignalState {
  const hasSignal = ageSecs < 60; // PRESENCE if no signal for 60s+
  if (!hasSignal) return 'presence';
  if (accuracy <= 5  && ageSecs <= 5)  return 'full';
  if (accuracy <= 30 || ageSecs <= 15) return 'reduced';
  return 'minimal';
}

export function buildStateObject(
  state:      SignalState,
  distM:      number | null,
  headerOverride?: string,
): ProximityFailureState {
  switch (state) {
    case 'full':
      return {
        state,
        showDots:      true,
        dotsOpacity:   1,
        showRoute:     true,
        routeOpacity:  1,
        showETA:       true,
        proximityText: null,
        headerCopy:    headerOverride ?? '',
        hapticPattern: null,
        hapticInterval: null,
      };
    case 'reduced':
      return {
        state,
        showDots:      true,
        dotsOpacity:   0.6,
        showRoute:     true,
        routeOpacity:  0.4,
        showETA:       false,
        proximityText: null,
        headerCopy:    headerOverride ?? DEGRADED_COPY.reduced,
        hapticPattern: HAPTIC.reducedAmbient,
        hapticInterval: 10_000,
      };
    case 'minimal':
      return {
        state,
        showDots:      false,
        dotsOpacity:   0,
        showRoute:     false,
        routeOpacity:  0,
        showETA:       false,
        proximityText: distM !== null ? proximityText(distM) : DEGRADED_COPY.driftSame,
        headerCopy:    headerOverride ?? DEGRADED_COPY.holdPosition,
        hapticPattern: HAPTIC.minimalAmbient,
        hapticInterval: 5_000,
      };
    case 'presence':
      return {
        state,
        showDots:      false,
        dotsOpacity:   0,
        showRoute:     false,
        routeOpacity:  0,
        showETA:       false,
        proximityText: null,
        headerCopy:    headerOverride ?? DEGRADED_COPY.presence0,
        hapticPattern: HAPTIC.presenceAmbient,
        hapticInterval: 3_000,
      };
  }
}

// ── Globe signal intensities under degraded mode — §8 ────────────────────────

export const GLOBE_INTENSITY = {
  full: {
    EN_ROUTE:  0.7,
    MEETPOINT: 0.8,
    ARRIVAL:   1.0,
    MET:       0.6,
  },
  degraded: {
    EN_ROUTE:  0.4,
    MEETPOINT: 0.8, // fixed coordinate — not GPS dependent
    ARRIVAL:   0.6,
    MET:       0.6, // loop closure — always full
  },
} as const;

export function globeIntensity(
  signal:    'EN_ROUTE' | 'MEETPOINT' | 'ARRIVAL' | 'MET',
  state:     SignalState,
): number {
  const tier = state === 'full' ? 'full' : 'degraded';
  return GLOBE_INTENSITY[tier][signal];
}

// ── ProximityFailureSystem — the monitor ──────────────────────��───────────────

export class ProximityFailureSystem {
  private history:       GpsPoint[] = [];
  private rogueCount:    number     = 0;
  private lastSignalTs:  number     = Date.now();
  private hapticTimer:   ReturnType<typeof setInterval> | null = null;
  private currentState:  SignalState = 'full';
  private onChange:      (s: ProximityFailureState) => void;
  private targetDistM:   number | null = null;
  private presenceTimer: ReturnType<typeof setInterval> | null = null;
  private presenceElapsed = 0;

  constructor(onChange: (s: ProximityFailureState) => void) {
    this.onChange = onChange;
  }

  /** Call on every GPS position update */
  update(lat: number, lng: number, accuracy = 10): void {
    const now    = Date.now();
    const point: GpsPoint = { lat, lng, ts: now };

    // Rogue point filter: if > 30m jump in < 3s from median → discard
    if (this.history.length >= 3) {
      const median = medianPoint(this.history.slice(-3));
      const jump   = haversineM(point, median);
      const dt     = (now - this.history[this.history.length - 1].ts) / 1000;
      if (jump > 30 && dt < 3) {
        this.rogueCount++;
        if (this.rogueCount >= 3) {
          this._transition(buildStateObject('minimal', this.targetDistM));
        }
        return; // discard
      }
    }

    // Valid point
    this.rogueCount   = 0;
    this.lastSignalTs = now;
    this.history = [...this.history.slice(-2), point]; // keep last 3

    const ageSecs = 0; // just received
    const state   = deriveState(accuracy, ageSecs, this.targetDistM);
    this._transition(buildStateObject(state, this.targetDistM));
  }

  /** Call when GPS/network is lost entirely */
  setNoSignal(): void {
    this._transition(buildStateObject('presence', this.targetDistM));
    this._startPresenceTimer();
  }

  /** Update last known target distance for proximity text */
  setTargetDistance(distM: number): void {
    this.targetDistM = distM;
  }

  private _transition(next: ProximityFailureState): void {
    if (next.state !== this.currentState) {
      this.currentState = next.state;
      this._resetHapticTimer(next);
      if (next.state !== 'presence') this._stopPresenceTimer();
    }
    this.onChange(next);
  }

  private _resetHapticTimer(state: ProximityFailureState): void {
    if (this.hapticTimer) { clearInterval(this.hapticTimer); this.hapticTimer = null; }
    if (state.hapticPattern && state.hapticInterval) {
      this.hapticTimer = setInterval(() => {
        hapticFire(state.hapticPattern!);
      }, state.hapticInterval);
    }
  }

  private _startPresenceTimer(): void {
    this._stopPresenceTimer();
    this.presenceElapsed = 0;
    this.presenceTimer = setInterval(() => {
      this.presenceElapsed += 30;
      let copy: string;
      if (this.presenceElapsed >= 120) copy = DEGRADED_COPY.presence120;
      else if (this.presenceElapsed >= 60) copy = DEGRADED_COPY.presence60;
      else copy = DEGRADED_COPY.presence0;
      this.onChange(buildStateObject('presence', this.targetDistM, copy));
    }, 30_000);
  }

  private _stopPresenceTimer(): void {
    if (this.presenceTimer) { clearInterval(this.presenceTimer); this.presenceTimer = null; }
    this.presenceElapsed = 0;
  }

  destroy(): void {
    if (this.hapticTimer)   { clearInterval(this.hapticTimer);   this.hapticTimer   = null; }
    if (this.presenceTimer) { clearInterval(this.presenceTimer); this.presenceTimer = null; }
  }
}
