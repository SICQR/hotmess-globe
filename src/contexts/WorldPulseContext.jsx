/**
 * WORLD PULSE — Global Ambient Layer
 * 
 * Purpose: "The world is alive."
 * 
 * Traits:
 * - Abstract
 * - Poetic
 * - Non-clickable
 * - Anonymised
 * - Globe-driven
 * - Background only
 * 
 * This layer subscribes to global events and emits abstract signals only.
 * It drives the globe atmosphere + glass feed — never identities.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// Signal types for the globe (abstract, anonymised)
const PULSE_TYPES = {
  HEARTBEAT: 'heartbeat',       // Steady global rhythm
  CITY_GLOW: 'city_glow',       // City activity level
  HEAT_BLOOM: 'heat_bloom',     // Venue/area heating up
  WAVE: 'wave',                 // Activity spreading
  BREATH: 'breath',             // Music/audio-driven
  TREMOR: 'tremor',             // SOS/safety (local only)
};

const initialState = {
  // Global atmosphere
  globalIntensity: 0.3,         // 0-1 baseline activity
  dominantMood: 'ambient',      // ambient | energetic | intimate | care
  
  // City-level signals (anonymised)
  cityHeat: {},                 // { cityId: heatLevel 0-1 }
  cityPulses: [],               // Active pulse animations
  
  // Audio sync
  audioReactive: false,
  bpm: null,
  
  // Time context
  timeOfDay: 'night',           // dawn | day | dusk | night
  peakWindow: false,            // Is it peak hours?
  
  // Queue for globe renderer
  pendingSignals: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_GLOBAL_INTENSITY':
      return { ...state, globalIntensity: Math.max(0, Math.min(1, action.payload)) };
    
    case 'SET_MOOD':
      return { ...state, dominantMood: action.payload };
    
    case 'UPDATE_CITY_HEAT':
      return {
        ...state,
        cityHeat: { ...state.cityHeat, [action.payload.cityId]: action.payload.heat },
      };
    
    case 'EMIT_PULSE': {
      const signal = {
        id: `pulse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: action.payload.type,
        cityId: action.payload.cityId,
        intensity: action.payload.intensity || 0.5,
        createdAt: Date.now(),
        expiresAt: Date.now() + (action.payload.durationMs || 3000),
      };
      return {
        ...state,
        cityPulses: [...state.cityPulses, signal].slice(-50), // Keep last 50
        pendingSignals: [...state.pendingSignals, signal],
      };
    }
    
    case 'CLEAR_EXPIRED_PULSES': {
      const now = Date.now();
      return {
        ...state,
        cityPulses: state.cityPulses.filter((p) => p.expiresAt > now),
      };
    }
    
    case 'CONSUME_SIGNALS':
      return { ...state, pendingSignals: [] };
    
    case 'SET_AUDIO_REACTIVE':
      return { ...state, audioReactive: action.payload.enabled, bpm: action.payload.bpm };
    
    case 'SET_TIME_CONTEXT':
      return { ...state, timeOfDay: action.payload.timeOfDay, peakWindow: action.payload.peakWindow };
    
    default:
      return state;
  }
}

const WorldPulseContext = createContext(null);

export function WorldPulseProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cleanupIntervalRef = useRef(null);
  const heartbeatRef = useRef(null);

  // Calculate time of day
  useEffect(() => {
    const updateTimeContext = () => {
      const hour = new Date().getHours();
      let timeOfDay = 'night';
      if (hour >= 5 && hour < 8) timeOfDay = 'dawn';
      else if (hour >= 8 && hour < 18) timeOfDay = 'day';
      else if (hour >= 18 && hour < 21) timeOfDay = 'dusk';
      
      // Peak window: 10pm - 3am
      const peakWindow = hour >= 22 || hour < 3;
      
      dispatch({ type: 'SET_TIME_CONTEXT', payload: { timeOfDay, peakWindow } });
    };
    
    updateTimeContext();
    const interval = setInterval(updateTimeContext, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Global heartbeat (steady rhythm)
  useEffect(() => {
    const baseInterval = state.peakWindow ? 2000 : 4000;
    
    heartbeatRef.current = setInterval(() => {
      dispatch({
        type: 'EMIT_PULSE',
        payload: {
          type: PULSE_TYPES.HEARTBEAT,
          cityId: null, // Global
          intensity: 0.2 + Math.random() * 0.2,
          durationMs: 1500,
        },
      });
    }, baseInterval);
    
    return () => clearInterval(heartbeatRef.current);
  }, [state.peakWindow]);

  // Clean up expired pulses
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      dispatch({ type: 'CLEAR_EXPIRED_PULSES' });
    }, 1000);
    
    return () => clearInterval(cleanupIntervalRef.current);
  }, []);

  // Subscribe to anonymised global events
  useEffect(() => {
    // Listen to beacon activity (anonymised)
    const beaconChannel = supabase
      .channel('world-pulse-beacons')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'beacons',
      }, (payload) => {
        const cityId = payload.new?.city_id;
        if (cityId) {
          dispatch({
            type: 'EMIT_PULSE',
            payload: {
              type: PULSE_TYPES.HEAT_BLOOM,
              cityId,
              intensity: 0.6,
              durationMs: 5000,
            },
          });
        }
      })
      .subscribe();

    // Listen to check-ins (anonymised)
    const checkinChannel = supabase
      .channel('world-pulse-checkins')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'checkins',
      }, (payload) => {
        const cityId = payload.new?.city_id;
        if (cityId) {
          dispatch({
            type: 'UPDATE_CITY_HEAT',
            payload: { cityId, heat: Math.min(1, (state.cityHeat[cityId] || 0) + 0.05) },
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(beaconChannel);
      supabase.removeChannel(checkinChannel);
    };
  }, [state.cityHeat]);

  // Emit pulse (for other components to trigger)
  const emitPulse = useCallback((type, cityId, options = {}) => {
    if (!Object.values(PULSE_TYPES).includes(type)) {
      console.warn(`Unknown pulse type: ${type}`);
      return;
    }
    dispatch({
      type: 'EMIT_PULSE',
      payload: {
        type,
        cityId,
        intensity: options.intensity,
        durationMs: options.durationMs,
      },
    });
  }, []);

  // Consume pending signals (called by globe renderer)
  const consumeSignals = useCallback(() => {
    const signals = [...state.pendingSignals];
    dispatch({ type: 'CONSUME_SIGNALS' });
    return signals;
  }, [state.pendingSignals]);

  // Set audio reactivity
  const setAudioReactive = useCallback((enabled, bpm = null) => {
    dispatch({ type: 'SET_AUDIO_REACTIVE', payload: { enabled, bpm } });
  }, []);

  const value = {
    ...state,
    PULSE_TYPES,
    emitPulse,
    consumeSignals,
    setAudioReactive,
  };

  return (
    <WorldPulseContext.Provider value={value}>
      {children}
    </WorldPulseContext.Provider>
  );
}

export function useWorldPulse() {
  const context = useContext(WorldPulseContext);
  if (!context) {
    throw new Error('useWorldPulse must be used within WorldPulseProvider');
  }
  return context;
}

export { PULSE_TYPES };
export default WorldPulseContext;
