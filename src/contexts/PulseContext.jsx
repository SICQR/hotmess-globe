import { createContext, useContext, useCallback, useRef } from 'react';

/**
 * Pulse Context
 * Emits visual/audio signals across the app
 * 
 * Signal types:
 * - local: affects user's city only
 * - global: ripples across globe
 * - directional: arc from origin to destination
 */

const PulseContext = createContext(null);

export const PULSE_TYPES = {
  SOFT: 'soft',           // App open, passive
  RIPPLE: 'ripple',       // CTA tap
  SPARK: 'spark',         // Commerce event
  ARC: 'arc',             // City-to-city connection
  BLOOM: 'bloom',         // Beacon drop
  TREMOR: 'tremor',       // Safety alert
};

export function PulseProvider({ children }) {
  const listenersRef = useRef(new Set());

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const emit = useCallback((type, payload = {}) => {
    const signal = {
      type,
      timestamp: Date.now(),
      ...payload,
    };
    listenersRef.current.forEach(fn => fn(signal));
  }, []);

  // Convenience emitters
  const softPulse = useCallback(() => emit(PULSE_TYPES.SOFT), [emit]);
  const ripple = useCallback((origin) => emit(PULSE_TYPES.RIPPLE, { origin }), [emit]);
  const spark = useCallback((origin) => emit(PULSE_TYPES.SPARK, { origin }), [emit]);
  const arc = useCallback((from, to) => emit(PULSE_TYPES.ARC, { from, to }), [emit]);
  const bloom = useCallback((origin, intensity = 1) => emit(PULSE_TYPES.BLOOM, { origin, intensity }), [emit]);
  const tremor = useCallback((origin) => emit(PULSE_TYPES.TREMOR, { origin }), [emit]);

  const value = {
    subscribe,
    emit,
    softPulse,
    ripple,
    spark,
    arc,
    bloom,
    tremor,
  };

  return (
    <PulseContext.Provider value={value}>
      {children}
    </PulseContext.Provider>
  );
}

export function usePulse() {
  const ctx = useContext(PulseContext);
  if (!ctx) throw new Error('usePulse must be used within PulseProvider');
  return ctx;
}

export default PulseContext;
