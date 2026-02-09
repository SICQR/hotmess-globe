/**
 * HOTMESS OS — Navigation
 * 
 * System modes and overlay management.
 * This is NOT React Router — it's OS-level navigation state.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM MODES (the 5 OS modes)
// ═══════════════════════════════════════════════════════════════════════════════

export type SystemMode =
  | 'HOME'     // Default landing, globe view
  | 'SOCIAL'   // Discovery, profiles, presence
  | 'EVENTS'   // Calendar, RSVP, check-in
  | 'RADIO'    // Live stream, shows, schedule
  | 'MARKET';  // Shop, products, cart

// ═══════════════════════════════════════════════════════════════════════════════
// OVERLAYS (sheets that slide over the OS)
// ═══════════════════════════════════════════════════════════════════════════════

export type OverlayType =
  | 'PROFILE'    // User profile sheet
  | 'EVENT'      // Event detail sheet
  | 'PRODUCT'    // Product detail sheet
  | 'CHAT'       // Messaging sheet
  | 'SAFETY'     // Safety hub sheet
  | 'AFTERCARE'  // Post-event care sheet
  | 'VAULT'      // Purchases/tickets
  | 'GHOSTED'    // Right Now / presence
  | 'SHOP'       // Store browse
  | null;        // No overlay

export interface OverlayState {
  type: OverlayType;
  props: Record<string, unknown>;
  id?: string; // For deep linking
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION STORE
// ═══════════════════════════════════════════════════════════════════════════════

interface NavigationStore {
  mode: SystemMode;
  overlay: OverlayState | null;
  overlayStack: OverlayState[];
  history: SystemMode[];
  listeners: Set<() => void>;
}

const store: NavigationStore = {
  mode: 'HOME',
  overlay: null,
  overlayStack: [],
  history: ['HOME'],
  listeners: new Set(),
};

// ═══════════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getMode(): SystemMode {
  return store.mode;
}

export function getOverlay(): OverlayState | null {
  return store.overlay;
}

export function hasOverlay(): boolean {
  return store.overlay !== null;
}

export function getOverlayStack(): OverlayState[] {
  return [...store.overlayStack];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function setMode(mode: SystemMode): void {
  if (store.mode === mode) return;
  
  store.history.push(mode);
  if (store.history.length > 10) store.history.shift();
  
  store.mode = mode;
  
  // Close overlay when changing modes (optional behavior)
  // store.overlay = null;
  
  notifyListeners();
  syncToUrl();
}

export function goBack(): boolean {
  // If overlay is open, close it first
  if (store.overlay) {
    closeOverlay();
    return true;
  }
  
  // Otherwise go back in mode history
  if (store.history.length > 1) {
    store.history.pop();
    store.mode = store.history[store.history.length - 1];
    notifyListeners();
    syncToUrl();
    return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERLAY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function openOverlay(type: Exclude<OverlayType, null>, props: Record<string, unknown> = {}): void {
  const overlay: OverlayState = { type, props, id: props.id as string };
  
  // Push current overlay to stack if exists
  if (store.overlay) {
    store.overlayStack.push(store.overlay);
  }
  
  store.overlay = overlay;
  notifyListeners();
  syncToUrl();
}

export function closeOverlay(): void {
  // Pop from stack if available
  if (store.overlayStack.length > 0) {
    store.overlay = store.overlayStack.pop()!;
  } else {
    store.overlay = null;
  }
  
  notifyListeners();
  syncToUrl();
}

export function closeAllOverlays(): void {
  store.overlay = null;
  store.overlayStack = [];
  notifyListeners();
  syncToUrl();
}

export function updateOverlayProps(props: Record<string, unknown>): void {
  if (store.overlay) {
    store.overlay.props = { ...store.overlay.props, ...props };
    notifyListeners();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// URL SYNC (for deep linking)
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_TO_PATH: Record<SystemMode, string> = {
  HOME: '/',
  SOCIAL: '/social',
  EVENTS: '/events',
  RADIO: '/radio',
  MARKET: '/market',
};

const PATH_TO_MODE: Record<string, SystemMode> = {
  '/': 'HOME',
  '/social': 'SOCIAL',
  '/events': 'EVENTS',
  '/radio': 'RADIO',
  '/market': 'MARKET',
  '/shop': 'MARKET',
  '/live': 'SOCIAL',
  '/pulse': 'HOME',
  '/connect': 'SOCIAL',
};

function syncToUrl(): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  const basePath = MODE_TO_PATH[store.mode] || '/';
  
  // Set overlay params
  if (store.overlay) {
    url.searchParams.set('sheet', store.overlay.type!.toLowerCase());
    if (store.overlay.id) {
      url.searchParams.set('id', store.overlay.id);
    }
    // Add other props as params
    Object.entries(store.overlay.props).forEach(([key, value]) => {
      if (key !== 'id' && value != null) {
        url.searchParams.set(key, String(value));
      }
    });
  } else {
    url.searchParams.delete('sheet');
    url.searchParams.delete('id');
  }
  
  // Update URL without reload
  const newUrl = basePath + url.search;
  if (window.location.pathname + window.location.search !== newUrl) {
    window.history.pushState({}, '', newUrl);
  }
}

export function hydrateFromUrl(): void {
  if (typeof window === 'undefined') return;
  
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  
  // Hydrate mode from path
  const mode = PATH_TO_MODE[path] || 'HOME';
  store.mode = mode;
  store.history = [mode];
  
  // Hydrate overlay from params
  const sheetParam = params.get('sheet');
  if (sheetParam) {
    const type = sheetParam.toUpperCase() as OverlayType;
    const props: Record<string, unknown> = {};
    
    params.forEach((value, key) => {
      if (key !== 'sheet') {
        props[key] = value;
      }
    });
    
    store.overlay = { type, props, id: props.id as string };
  }
  
  notifyListeners();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BROWSER BACK BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

export function initBackButtonHandler(): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event: PopStateEvent) => {
    // If overlay is open, close it instead of navigating
    if (store.overlay) {
      event.preventDefault();
      closeOverlay();
      // Re-push state to prevent actual navigation
      window.history.pushState({}, '', window.location.href);
    }
  };
  
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

export function subscribeToNavigation(listener: () => void): () => void {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

function notifyListeners(): void {
  store.listeners.forEach(listener => listener());
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOKS (convenience)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

export function useNavigationMode(): SystemMode {
  const [mode, setMode] = useState<SystemMode>(getMode);
  
  useEffect(() => {
    return subscribeToNavigation(() => setMode(getMode()));
  }, []);
  
  return mode;
}

export function useOverlay(): OverlayState | null {
  const [overlay, setOverlayState] = useState<OverlayState | null>(getOverlay);
  
  useEffect(() => {
    return subscribeToNavigation(() => setOverlayState(getOverlay()));
  }, []);
  
  return overlay;
}

export function useNavigation() {
  const mode = useNavigationMode();
  const overlay = useOverlay();
  
  return {
    mode,
    overlay,
    hasOverlay: overlay !== null,
    setMode,
    openOverlay,
    closeOverlay,
    closeAllOverlays,
    goBack,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBUG
// ═══════════════════════════════════════════════════════════════════════════════

export function debugNavigation(): void {
  console.log('[Navigation]', {
    mode: store.mode,
    overlay: store.overlay,
    stack: store.overlayStack,
    history: store.history,
  });
}
