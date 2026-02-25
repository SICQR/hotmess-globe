/**
 * NOW SIGNALS — Local Contextual Layer
 * 
 * Purpose: "Something relevant to you is happening right now."
 * 
 * Traits:
 * - Context-aware
 * - Permissioned
 * - Sparse
 * - Actionable
 * - Time-bound
 * 
 * NOW Signals appear ONLY when:
 * - User is in relevant context (browsing, event mode, etc.)
 * - Signal is user-specific (follows, chemistry, proximity)
 * - Time window is active
 * 
 * They are NOT everywhere and NOT constant.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// Signal categories
const NOW_SIGNAL_TYPES = {
  // Ghosted Grid signals
  NOW_NEARBY: 'now_nearby',
  ACTIVE_TONIGHT: 'active_tonight',
  LOOKING_RIGHT_NOW: 'looking_right_now',
  MATCHED_BEFORE: 'matched_before',
  HIGH_CHEMISTRY: 'high_chemistry',
  
  // Event / Beacon signals
  VENUE_FILLING: 'venue_filling',
  KNOW_PEOPLE_HERE: 'know_people_here',
  MATCHES_ATTENDING: 'matches_attending',
  TONIGHT_ONLY: 'tonight_only',
  DOORS_OPEN: 'doors_open',
  PEAK_HOUR: 'peak_hour',
  FINAL_CALL: 'final_call',
  
  // Following / Chemistry triggers
  FOLLOWED_ACTIVE: 'followed_active',
  CHEMISTRY_NEARBY: 'chemistry_nearby',
  MUTUAL_INTEREST: 'mutual_interest',
};

// User context modes (where they are in the app)
const USER_CONTEXTS = {
  IDLE: 'idle',
  BROWSING_PEOPLE: 'browsing_people',
  EVENT_MODE: 'event_mode',
  MESSAGING: 'messaging',
  SHOPPING: 'shopping',
};

const initialState = {
  // User context
  currentContext: USER_CONTEXTS.IDLE,
  userId: null,
  userLocation: null,
  
  // Active signals (sparse, max 3)
  activeSignals: [],
  
  // Dismissed signals (don't show again this session)
  dismissedIds: new Set(),
  
  // Permissions
  followNotificationsEnabled: true,
  chemistryNotificationsEnabled: true,
  proximityEnabled: false,
  
  // Loading
  isLoading: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, userId: action.payload.userId, isLoading: false };
    
    case 'SET_CONTEXT':
      return { ...state, currentContext: action.payload };
    
    case 'SET_LOCATION':
      return { ...state, userLocation: action.payload };
    
    case 'ADD_SIGNAL': {
      // Enforce sparsity: max 3 active, no duplicates
      if (state.dismissedIds.has(action.payload.id)) return state;
      if (state.activeSignals.some((s) => s.id === action.payload.id)) return state;
      if (state.activeSignals.length >= 3) {
        // Remove oldest
        const [, ...rest] = state.activeSignals;
        return { ...state, activeSignals: [...rest, action.payload] };
      }
      return { ...state, activeSignals: [...state.activeSignals, action.payload] };
    }
    
    case 'DISMISS_SIGNAL': {
      const newDismissed = new Set(state.dismissedIds);
      newDismissed.add(action.payload);
      return {
        ...state,
        activeSignals: state.activeSignals.filter((s) => s.id !== action.payload),
        dismissedIds: newDismissed,
      };
    }
    
    case 'CLEAR_EXPIRED': {
      const now = Date.now();
      return {
        ...state,
        activeSignals: state.activeSignals.filter((s) => !s.expiresAt || s.expiresAt > now),
      };
    }
    
    case 'SET_PERMISSIONS':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

const NowSignalContext = createContext(null);

export function NowSignalProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cleanupRef = useRef(null);
  // Derive user from AuthContext — single source of truth, no duplicate listener
  const { user } = useAuth();

  // Sync user ID from AuthContext
  useEffect(() => {
    dispatch({ type: 'SET_USER', payload: { userId: user?.id || null } });
  }, [user?.id]);

  // Clean up expired signals
  useEffect(() => {
    cleanupRef.current = setInterval(() => {
      dispatch({ type: 'CLEAR_EXPIRED' });
    }, 5000);
    return () => clearInterval(cleanupRef.current);
  }, []);

  // Subscribe to context-relevant events
  useEffect(() => {
    if (!state.userId) return;
    if (state.currentContext === USER_CONTEXTS.IDLE) return;

    const channels = [];

    // Followed users activity (when browsing or event mode)
    if (
      state.followNotificationsEnabled &&
      (state.currentContext === USER_CONTEXTS.BROWSING_PEOPLE ||
        state.currentContext === USER_CONTEXTS.EVENT_MODE)
    ) {
      const followChannel = supabase
        .channel(`now-signal-follows-${state.userId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=in.(SELECT followed_id FROM follows WHERE follower_id='${state.userId}')`,
        }, (payload) => {
          // Check if they became active recently
          const lastSeen = new Date(payload.new?.last_seen);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          if (lastSeen > fiveMinutesAgo) {
            dispatch({
              type: 'ADD_SIGNAL',
              payload: {
                id: `followed-${payload.new?.id}-${Date.now()}`,
                type: NOW_SIGNAL_TYPES.FOLLOWED_ACTIVE,
                message: 'Someone you follow is active nearby',
                targetId: payload.new?.id,
                expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
                createdAt: Date.now(),
              },
            });
          }
        })
        .subscribe();
      channels.push(followChannel);
    }

    // Venue activity (when in event mode)
    if (state.currentContext === USER_CONTEXTS.EVENT_MODE) {
      const venueChannel = supabase
        .channel(`now-signal-venues-${state.userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'checkins',
        }, (payload) => {
          // This would be filtered server-side for venues user is interested in
          // For now, emit generic signal
          dispatch({
            type: 'ADD_SIGNAL',
            payload: {
              id: `venue-${payload.new?.venue_id}-${Date.now()}`,
              type: NOW_SIGNAL_TYPES.VENUE_FILLING,
              message: 'Venue filling fast',
              targetId: payload.new?.venue_id,
              expiresAt: Date.now() + 30 * 60 * 1000, // 30 min
              createdAt: Date.now(),
            },
          });
        })
        .subscribe();
      channels.push(venueChannel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [state.userId, state.currentContext, state.followNotificationsEnabled]);

  // Set user context (called by pages/components)
  const setContext = useCallback((context) => {
    if (!Object.values(USER_CONTEXTS).includes(context)) {
      console.warn(`Unknown context: ${context}`);
      return;
    }
    dispatch({ type: 'SET_CONTEXT', payload: context });
  }, []);

  // Set user location
  const setLocation = useCallback((location) => {
    dispatch({ type: 'SET_LOCATION', payload: location });
  }, []);

  // Emit a manual signal (for testing or specific triggers)
  const emitNowSignal = useCallback((type, options = {}) => {
    if (!Object.values(NOW_SIGNAL_TYPES).includes(type)) {
      console.warn(`Unknown NOW signal type: ${type}`);
      return;
    }
    dispatch({
      type: 'ADD_SIGNAL',
      payload: {
        id: `manual-${type}-${Date.now()}`,
        type,
        message: options.message || type.replace(/_/g, ' '),
        targetId: options.targetId,
        expiresAt: options.expiresAt || Date.now() + 10 * 60 * 1000,
        createdAt: Date.now(),
        action: options.action, // { label, onClick } for CTA
      },
    });
  }, []);

  // Dismiss a signal
  const dismissSignal = useCallback((signalId) => {
    dispatch({ type: 'DISMISS_SIGNAL', payload: signalId });
  }, []);

  // Get signals for current context
  const getContextSignals = useCallback(() => {
    const contextSignalMap = {
      [USER_CONTEXTS.BROWSING_PEOPLE]: [
        NOW_SIGNAL_TYPES.NOW_NEARBY,
        NOW_SIGNAL_TYPES.ACTIVE_TONIGHT,
        NOW_SIGNAL_TYPES.LOOKING_RIGHT_NOW,
        NOW_SIGNAL_TYPES.MATCHED_BEFORE,
        NOW_SIGNAL_TYPES.HIGH_CHEMISTRY,
        NOW_SIGNAL_TYPES.FOLLOWED_ACTIVE,
        NOW_SIGNAL_TYPES.CHEMISTRY_NEARBY,
      ],
      [USER_CONTEXTS.EVENT_MODE]: [
        NOW_SIGNAL_TYPES.VENUE_FILLING,
        NOW_SIGNAL_TYPES.KNOW_PEOPLE_HERE,
        NOW_SIGNAL_TYPES.MATCHES_ATTENDING,
        NOW_SIGNAL_TYPES.TONIGHT_ONLY,
        NOW_SIGNAL_TYPES.DOORS_OPEN,
        NOW_SIGNAL_TYPES.PEAK_HOUR,
        NOW_SIGNAL_TYPES.FINAL_CALL,
      ],
    };
    
    const relevantTypes = contextSignalMap[state.currentContext] || [];
    return state.activeSignals.filter((s) => relevantTypes.includes(s.type));
  }, [state.activeSignals, state.currentContext]);

  const value = {
    ...state,
    NOW_SIGNAL_TYPES,
    USER_CONTEXTS,
    setContext,
    setLocation,
    emitNowSignal,
    dismissSignal,
    getContextSignals,
  };

  return (
    <NowSignalContext.Provider value={value}>
      {children}
    </NowSignalContext.Provider>
  );
}

export function useNowSignals() {
  const context = useContext(NowSignalContext);
  if (!context) {
    throw new Error('useNowSignals must be used within NowSignalProvider');
  }
  return context;
}

export { NOW_SIGNAL_TYPES, USER_CONTEXTS };
export default NowSignalContext;
