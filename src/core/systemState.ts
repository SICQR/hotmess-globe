/**
 * HOTMESS OS — System State
 * 
 * The single source of truth for app-wide system state.
 * This is NOT React state — it's the OS kernel.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM STATES (the only states that matter)
// ═══════════════════════════════════════════════════════════════════════════════

export type SystemState =
  | 'AGE_REQUIRED'        // Must verify 18+
  | 'CONSENT_REQUIRED'    // Must accept terms
  | 'ONBOARDING_REQUIRED' // Must complete profile setup
  | 'OS_READY'            // Normal operation
  | 'EMERGENCY_ACTIVE'    // Hard override - safety first
  | 'BLOCKED';            // Hard fail (underage, banned)

// ═══════════════════════════════════════════════════════════════════════════════
// STATE STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

interface SystemStateStore {
  state: SystemState;
  previousState: SystemState | null;
  emergencyTriggeredAt: number | null;
  blockReason: string | null;
  listeners: Set<(state: SystemState) => void>;
}

const store: SystemStateStore = {
  state: 'AGE_REQUIRED',
  previousState: null,
  emergencyTriggeredAt: null,
  blockReason: null,
  listeners: new Set(),
};

// ═══════════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getSystemState(): SystemState {
  return store.state;
}

export function isEmergencyActive(): boolean {
  return store.state === 'EMERGENCY_ACTIVE';
}

export function isOSReady(): boolean {
  return store.state === 'OS_READY';
}

export function isBlocked(): boolean {
  return store.state === 'BLOCKED';
}

export function getBlockReason(): string | null {
  return store.blockReason;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function setSystemState(newState: SystemState, reason?: string): void {
  if (store.state === newState) return;
  
  // Emergency can ALWAYS be set, regardless of current state (including BLOCKED)
  if (newState === 'EMERGENCY_ACTIVE') {
    store.previousState = store.state;
    store.emergencyTriggeredAt = Date.now();
    store.state = newState;
    notifyListeners();
    return;
  }
  
  // Can't transition out of BLOCKED (except for EMERGENCY_ACTIVE handled above)
  if (store.state === 'BLOCKED') {
    console.warn('[SystemState] Cannot transition out of BLOCKED state');
    return;
  }
  
  // Can't skip gates (except emergency)
  const validTransitions: Record<SystemState, SystemState[]> = {
    'AGE_REQUIRED': ['CONSENT_REQUIRED', 'BLOCKED', 'EMERGENCY_ACTIVE'],
    'CONSENT_REQUIRED': ['ONBOARDING_REQUIRED', 'OS_READY', 'BLOCKED', 'EMERGENCY_ACTIVE'],
    'ONBOARDING_REQUIRED': ['OS_READY', 'BLOCKED', 'EMERGENCY_ACTIVE'],
    'OS_READY': ['EMERGENCY_ACTIVE', 'BLOCKED'],
    'EMERGENCY_ACTIVE': ['OS_READY', 'AGE_REQUIRED', 'BLOCKED'], // Can return to previous
    'BLOCKED': ['EMERGENCY_ACTIVE'], // Only emergency escapes
  };
  
  if (!validTransitions[store.state].includes(newState)) {
    console.warn(`[SystemState] Invalid transition: ${store.state} → ${newState}`);
    return;
  }
  
  store.previousState = store.state;
  store.state = newState;
  
  if (newState === 'BLOCKED' && reason) {
    store.blockReason = reason;
  }
  
  notifyListeners();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIFIC TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function confirmAge(): void {
  if (store.state === 'AGE_REQUIRED') {
    setSystemState('CONSENT_REQUIRED');
  }
}

export function confirmConsent(): void {
  if (store.state === 'CONSENT_REQUIRED') {
    setSystemState('ONBOARDING_REQUIRED');
  }
}

export function skipOnboarding(): void {
  if (store.state === 'CONSENT_REQUIRED') {
    setSystemState('OS_READY');
  }
}

export function completeOnboarding(): void {
  if (store.state === 'ONBOARDING_REQUIRED') {
    setSystemState('OS_READY');
  }
}

export function blockUser(reason: string): void {
  setSystemState('BLOCKED', reason);
}

export function resolveEmergency(): void {
  if (store.state === 'EMERGENCY_ACTIVE' && store.previousState) {
    store.emergencyTriggeredAt = null;
    setSystemState(store.previousState);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HYDRATION (from storage/auth)
// ═══════════════════════════════════════════════════════════════════════════════

interface HydrationData {
  ageVerified?: boolean;
  consentAccepted?: boolean;
  onboardingComplete?: boolean;
  isBanned?: boolean;
  banReason?: string;
}

export function hydrateSystemState(data: HydrationData): void {
  if (data.isBanned) {
    store.state = 'BLOCKED';
    store.blockReason = data.banReason || 'Account suspended';
    notifyListeners();
    return;
  }
  
  if (!data.ageVerified) {
    store.state = 'AGE_REQUIRED';
  } else if (!data.consentAccepted) {
    store.state = 'CONSENT_REQUIRED';
  } else if (!data.onboardingComplete) {
    store.state = 'ONBOARDING_REQUIRED';
  } else {
    store.state = 'OS_READY';
  }
  
  notifyListeners();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

export function subscribeToSystemState(listener: (state: SystemState) => void): () => void {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

function notifyListeners(): void {
  store.listeners.forEach(listener => listener(store.state));
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK (convenience)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

export function useSystemState(): SystemState {
  const [state, setState] = useState<SystemState>(getSystemState);
  
  useEffect(() => {
    return subscribeToSystemState(setState);
  }, []);
  
  return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBUG
// ═══════════════════════════════════════════════════════════════════════════════

export function debugSystemState(): void {
  console.log('[SystemState]', {
    current: store.state,
    previous: store.previousState,
    emergency: store.emergencyTriggeredAt,
    blocked: store.blockReason,
  });
}
