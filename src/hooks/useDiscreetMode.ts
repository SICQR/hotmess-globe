/**
 * useDiscreetMode — global Discreet Mode toggle.
 *
 * When ON: all member avatars on the Pulse globe render as abstract
 * HOTMESS-mark glyphs at the map level. Photos remain visible at the
 * profile-card level on tap (Discreet Mode is a map-only redaction).
 *
 * When OFF (default): normal avatar rendering.
 *
 * Persistence: localStorage, key `hotmess:discreetMode` (boolean string).
 * Setting persists across sessions per the design refinement brief.
 * No schema column — entirely a client-side preference.
 *
 * Usage:
 *   const { discreet, setDiscreet, toggle } = useDiscreetMode();
 *   // In a member-dot render:
 *   return discreet ? <HotmessMarkGlyph /> : <MemberAvatar src={url} />;
 */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hotmess:discreetMode';

function readInitial(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useDiscreetMode() {
  const [discreet, setDiscreetState] = useState<boolean>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, discreet ? '1' : '0');
    } catch {
      // ignore — localStorage may be blocked in private modes
    }
  }, [discreet]);

  // Cross-tab sync: respond to storage events from other tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setDiscreetState(e.newValue === '1');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setDiscreet = useCallback((v: boolean) => setDiscreetState(v), []);
  const toggle = useCallback(() => setDiscreetState((v) => !v), []);

  return { discreet, setDiscreet, toggle };
}

export default useDiscreetMode;
