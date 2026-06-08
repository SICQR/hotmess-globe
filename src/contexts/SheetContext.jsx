/**
 * SheetContext — L2 Sheet State Management
 * 
 * The nervous system for HOTMESS sheets.
 * Manages which sheet is open, props, stack for nested sheets,
 * and syncs with URL params for deep linking.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SHEET LAWS (Immutable Rules)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * LAW 1: SINGLE AUTHORITY — SheetContext is the ONLY sheet state owner
 * LAW 2: LIFO STACK — Back button pops top sheet before route
 * LAW 3: URL SYNC — Active sheet syncs to ?sheet=<type> param
 * LAW 4: NO REMOUNT — Opening/closing sheets never remounts globe
 * LAW 5: DETERMINISTIC CLOSE — Swipe/tap/escape/back all close predictably
 * 
 * See /src/lib/sheetSystem.ts for full specification.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { canOpenSheet } from '@/lib/sheetPolicy';
import { toast } from 'sonner';
import {
  SHEET_REGISTRY,
  SHEET_SPRING,
  SWIPE,
  getSheetHeight,
  isValidSheetType,
  requiresAuth,
  buildSheetUrl,
  parseSheetFromUrl,
} from '@/lib/sheetSystem';
// D57 §10.1 — URL→sheet hydration must wait for BootGuard READY.
// Before READY: L2SheetContainer isn't mounted yet, supabase session may not
// have resolved, and canOpenSheet sees a stale pathname. Pre-READY hydration
// silently no-ops the push intent — the user lands on /ghosted with the
// URL params present but no sheet opens (CF-2 + CF-7 / S2 / tag N1).
import { useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';

// Re-export sheet types as constants for convenience
export const SHEET_TYPES = Object.fromEntries(
  Object.keys(SHEET_REGISTRY).map(key => [key.toUpperCase().replace(/-/g, '_'), key])
);

const initialState = {
  // Currently active sheet (null = closed)
  activeSheet: null,
  // Props passed to the active sheet
  sheetProps: {},
  // Stack for nested sheets (future use)
  sheetStack: [],
  // Animation state
  isAnimating: false,
  // Direction (for swipe gestures)
  direction: 'up',
};

function sheetReducer(state, action) {
  switch (action.type) {
    case 'OPEN_SHEET':
      return {
        ...state,
        activeSheet: action.payload.type,
        sheetProps: action.payload.props || {},
        isAnimating: true,
        direction: 'up',
      };
    
    case 'CLOSE_SHEET':
      return {
        ...state,
        activeSheet: null,
        sheetProps: {},
        isAnimating: true,
        direction: 'down',
      };
    
    case 'PUSH_SHEET':
      // For nested sheets
      return {
        ...state,
        sheetStack: [
          ...state.sheetStack,
          { type: state.activeSheet, props: state.sheetProps }
        ],
        activeSheet: action.payload.type,
        sheetProps: action.payload.props || {},
        isAnimating: true,
      };
    
    case 'POP_SHEET':
      if (state.sheetStack.length === 0) {
        return { ...state, activeSheet: null, sheetProps: {}, isAnimating: true };
      }
      const previous = state.sheetStack[state.sheetStack.length - 1];
      return {
        ...state,
        sheetStack: state.sheetStack.slice(0, -1),
        activeSheet: previous.type,
        sheetProps: previous.props,
        isAnimating: true,
      };
    
    case 'DISMISS_ALL':
      // Close all sheets including stack
      return {
        ...state,
        activeSheet: null,
        sheetProps: {},
        sheetStack: [],
        isAnimating: true,
        direction: 'down',
      };
    
    case 'ANIMATION_COMPLETE':
      return { ...state, isAnimating: false };
    
    case 'UPDATE_PROPS':
      return { ...state, sheetProps: { ...state.sheetProps, ...action.payload } };
    
    default:
      return state;
  }
}

const SheetContext = createContext(null);

export function SheetProvider({ children }) {
  const [state, dispatch] = useReducer(sheetReducer, initialState);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  // D57 §10.1 — gate URL→state hydration on BootGuard READY. See Effect 2.
  const { bootState } = useBootGuard();
  // Prevent State→URL from clearing deep-link params before URL→State hydrates
  const hasHydrated = useRef(false);
  // Phil 2026-06-02 — set true by closeSheet, consumed by Effect 2 to skip
  // re-opening from a still-stale URL. See closeSheet comment.
  const justClosedRef = useRef(false);
  // Phil 2026-06-02 D53 #566 — same pattern as justClosedRef but for sheet→sheet
  // open transitions. Effect 2 (URL→state) would otherwise see stale URL during
  // the open dispatch and snap state back. This is the substrate-level fix for
  // every previously-silent sheet→sheet dead end (PHOTOS, ALBUMS, MEMBERSHIP,
  // CREATE-PERSONA, MESSAGE-from-profile without the close-then-defer hack).
  const justOpenedRef = useRef(false);
  // D57 §10.1 — track whether we've already consumed the cold-boot URL intent
  // so the gate doesn't re-fire on every boot-state transition after READY.
  const coldBootConsumedRef = useRef(false);

  // Open a sheet — enforces UI policy (chat/video/travel gated to Ghosted context)
  // D53 substrate fix — mirrors closeSheet's contract:
  //   (a) flip justOpenedRef so Effect 2 (URL→state) treats the next searchParams
  //       update as the echo of our own transition, not as a deep-link to honor.
  //   (b) synchronously pushState the new sheet param so the URL is correct
  //       NOW, before React Router's async setSearchParams loses the race with
  //       Effect 2's closure capture of stale searchParams. Effect 1's
  //       setSearchParams still runs (idempotent) so router internal state
  //       catches up via the normal path.
  //   Without this, sheet→sheet transitions (edit-profile→photos etc.) silently
  //   no-op as Effect 2 snaps state back to the stale URL value.
  const openSheet = useCallback((type, props = {}) => {
    if (!canOpenSheet(type, location.pathname, state.sheetStack, state.activeSheet, props)) {
      toast('Go to Ghosted to start a conversation', { duration: 2500 });
      return;
    }
    justOpenedRef.current = true;
    if (typeof window !== 'undefined') {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('sheet', type);
        // Mirror Effect 1's deep-link param set (id/email/thread/handle).
        // Set when provided; delete when not — prevents stale params bleeding
        // from the previous sheet (e.g. profile id leaking into photos).
        // #599 — read deepLinkParams from registry, not hardcoded.
        // Old code only synced ['id','email','thread','handle']. The 'beacon'
        // kind needs 'beaconId' (registry contract). Tapping a beacon set
        // ?sheet=beacon but dropped beaconId, so URL→state rehydration mounted
        // L2BeaconSheet with empty props → fell through to BeaconCreator
        // (drop intent picker) on every beacon tap. Phil 2026-06-03 live repro.
        const def = SHEET_REGISTRY[type];
        const linkParams = (def && Array.isArray(def.deepLinkParams) && def.deepLinkParams.length > 0)
          ? def.deepLinkParams
          : ['id', 'email', 'thread', 'handle'];
        // Always clear the legacy set too so stale params from a different
        // sheet (e.g. ?id= left from a profile sheet) don't bleed across.
        new Set([...linkParams, 'id', 'email', 'thread', 'handle']).forEach((k) => {
          if (props && props[k] != null) u.searchParams.set(k, String(props[k]));
          else u.searchParams.delete(k);
        });
        // pushState (not replaceState) so back button still pops the prior sheet
        // — preserves LAW 2 (LIFO close discipline).
        window.history.pushState(null, '', u.toString());
      } catch (_) { /* non-fatal */ }
    }
    dispatch({ type: 'OPEN_SHEET', payload: { type, props } });
  }, [location.pathname, state.sheetStack, state.activeSheet]);

  // Close the active sheet
  //
  // Phil 2026-06-02 P0 fix — backdrop tap + Escape were firing handleClose
  // and calling closeSheet, but the sheet stayed open. Root cause: the
  // URL→state effect (deps:[searchParams]) reads state.activeSheet from a
  // stale closure. Between CLOSE_SHEET dispatch and Effect 1's
  // setSearchParams completing, the URL still had sheet+id params. Effect 2
  // would fire on the subsequent searchParams change, see sheetFromUrl='profile'
  // and (stale) state.activeSheet=null → call openSheet → re-open the sheet.
  //
  // Two-belt fix:
  // (a) justClosed ref — suppresses Effect 2's open branch for one tick after
  //     a user-initiated close. Effect 2 sees the flag, resets it, returns.
  // (b) synchronous history.replaceState — clears URL params NOW, before
  //     React Router's async setSearchParams has a chance to lose the race.
  //     React Router's internal state catches up via the normal effect path.
  const closeSheet = useCallback(() => {
    // D57 P0.3 N6 — smart pop. If the LIFO stack has items (the current
    // sheet was push'd from a parent sheet via pushSheet), pop to the
    // parent instead of clearing entirely. This is how "close chat returns
    // to inbox" / "close chat returns to profile" works.
    //
    // The state→URL Effect 1 will re-sync URL params to the popped-to sheet
    // (so deeplink params for the parent are restored). We don't pre-clear
    // URL params here — that would strip the parent's params before the
    // effect can write them back.
    if (state.sheetStack.length > 0) {
      dispatch({ type: 'POP_SHEET' });
      return;
    }

    justClosedRef.current = true;
    if (typeof window !== 'undefined') {
      try {
        const u = new URL(window.location.href);
        // #599 — delete ALL possible link params from any registered sheet kind
        u.searchParams.delete('sheet');
        try {
          const allKeys = new Set(['id','email','thread','handle']);
          if (typeof SHEET_REGISTRY === 'object') {
            for (const def of Object.values(SHEET_REGISTRY)) {
              if (def && Array.isArray(def.deepLinkParams)) {
                for (const k of def.deepLinkParams) allKeys.add(k);
              }
            }
          }
          for (const k of allKeys) u.searchParams.delete(k);
        } catch (_) {
          // fallback: delete the legacy hardcoded set
          ['id','email','thread','handle'].forEach(k => u.searchParams.delete(k));
        }
        window.history.replaceState(null, '', u.toString());
      } catch (_) { /* non-fatal */ }
    }
    dispatch({ type: 'CLOSE_SHEET' });
  }, [state.sheetStack.length]);

  // Push a nested sheet (keeps current in stack)
  const pushSheet = useCallback((type, props = {}) => {
    dispatch({ type: 'PUSH_SHEET', payload: { type, props } });
  }, []);

  // Pop back to previous sheet
  const popSheet = useCallback(() => {
    dispatch({ type: 'POP_SHEET' });
  }, []);

  // Dismiss all sheets (clears entire stack)
  const dismissAll = useCallback(() => {
    dispatch({ type: 'DISMISS_ALL' });
  }, []);

  // Mark animation complete
  const onAnimationComplete = useCallback(() => {
    dispatch({ type: 'ANIMATION_COMPLETE' });
  }, []);

  // Update sheet props without re-opening
  const updateSheetProps = useCallback((props) => {
    dispatch({ type: 'UPDATE_PROPS', payload: props });
  }, []);

  // Sync state → URL
  useEffect(() => {
    if (!hasHydrated.current) return;
    const currentSheet = searchParams.get('sheet');
    
    if (state.activeSheet && state.activeSheet !== currentSheet) {
      // Sheet opened — push new URL entry (so back button can close it)
      const newParams = new URLSearchParams(searchParams);
      newParams.set('sheet', state.activeSheet);
      
      // Add relevant props to URL for deep linking
      if (state.sheetProps.id) newParams.set('id', state.sheetProps.id);
      if (state.sheetProps.email) newParams.set('email', state.sheetProps.email);
      if (state.sheetProps.thread) newParams.set('thread', state.sheetProps.thread);
      if (state.sheetProps.handle) newParams.set('handle', state.sheetProps.handle);
      
      // Use push (not replace) so back button creates separate history entry
      setSearchParams(newParams, { replace: false });
    } else if (!state.activeSheet && currentSheet) {
      // Sheet closed — replace URL to clean up params (no new history entry)
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('sheet');
      newParams.delete('id');
      newParams.delete('email');
      newParams.delete('thread');
      newParams.delete('handle');
      setSearchParams(newParams, { replace: true });
    }
  }, [state.activeSheet, state.sheetProps]);

  // Sync URL → state (for deep links / back button)
  //
  // D57 §10.1 — BootGuard READY gate. Cold-boot push opens (e.g. tapping a
  // notification while app is closed) arrive here with searchParams already
  // populated from /ghosted?sheet=chat&thread=xyz. Before READY:
  //   - L2SheetContainer is not yet mounted (Layout gates on bootState)
  //   - supabase session may not have resolved
  //   - canOpenSheet sees stale pathname / location state
  // The first effect run silently fires openSheet, the state reducer accepts
  // it, but by the time L2SheetContainer mounts the sheet may have been
  // dismissed by the state→URL echo or never rendered. The user lands on
  // /ghosted with the URL params present and no sheet — N1 / CF-2 + CF-7 / S2.
  //
  // Fix: defer until bootState === READY. The effect re-runs when bootState
  // transitions. Until then, we leave hasHydrated.current = false so the
  // state→URL Effect 1 also stays parked (it guards on hasHydrated).
  useEffect(() => {
    // D57 §10.1 gate — wait for app shell to be ready.
    if (bootState !== BOOT_STATES.READY) return;

    hasHydrated.current = true;
    // Phil 2026-06-02 — if closeSheet just fired, suppress re-open from
    // stale URL. The flag is set in closeSheet and consumed exactly once.
    if (justClosedRef.current) {
      justClosedRef.current = false;
      return;
    }
    // D53 #566 — same guard but for open transitions. See justOpenedRef declaration.
    if (justOpenedRef.current) {
      justOpenedRef.current = false;
      return;
    }
    const sheetFromUrl = searchParams.get('sheet');

    if (sheetFromUrl && sheetFromUrl !== state.activeSheet) {
      // URL has sheet param but state doesn't match — open it.
      // Read deepLinkParams from the sheet registry (D57 §10.2) so push
      // intents that carry sheet-specific params (e.g. beaconId for pulse,
      // recipientId for chat) hydrate alongside the legacy hardcoded set.
      const def = SHEET_REGISTRY[sheetFromUrl];
      const linkParams = (def && Array.isArray(def.deepLinkParams) && def.deepLinkParams.length > 0)
        ? def.deepLinkParams
        : ['id', 'email', 'thread', 'handle'];
      const allKeys = new Set([...linkParams, 'id', 'email', 'thread', 'handle']);
      const props = {};
      for (const k of allKeys) {
        const v = searchParams.get(k);
        if (v != null) props[k] = v;
      }

      // D57 §10.5 — lastHydratedIntent telemetry. Capture before openSheet
      // so failed opens, auth-race failures, and RLS-denied sheet opens are
      // debuggable from Sentry / PostHog event context. Session-only —
      // intentionally not persisted to storage.
      const isColdBoot = !coldBootConsumedRef.current;
      if (isColdBoot) coldBootConsumedRef.current = true;
      try {
        if (typeof window !== 'undefined') {
          window.__hotmessLastIntent = {
            source: isColdBoot ? 'cold-boot' : 'url',
            target: { type: sheetFromUrl, props },
            ts: Date.now(),
            outcome: 'pending',
          };
        }
      } catch (_) { /* non-fatal */ }

      try {
        openSheet(sheetFromUrl, props);
        if (typeof window !== 'undefined' && window.__hotmessLastIntent) {
          window.__hotmessLastIntent.outcome = 'opened';
        }
      } catch (err) {
        if (typeof window !== 'undefined' && window.__hotmessLastIntent) {
          window.__hotmessLastIntent.outcome = 'failed';
          window.__hotmessLastIntent.failureReason = String(err?.message || err);
        }
        // Re-throw so existing error reporting still catches it.
        throw err;
      }
    } else if (!sheetFromUrl && state.activeSheet) {
      // URL cleared (back button) — close sheet
      closeSheet();
    }
  }, [searchParams, bootState]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('sheet') && state.activeSheet) {
        closeSheet();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.activeSheet, closeSheet]);

  const value = {
    // State
    activeSheet: state.activeSheet,
    sheetProps: state.sheetProps,
    sheetStack: state.sheetStack,
    isAnimating: state.isAnimating,
    isOpen: !!state.activeSheet,
    
    // Actions (LIFO stack API)
    openSheet,      // push: open a sheet (alias for push single)
    closeSheet,     // pop: close current sheet
    pushSheet,      // push: open nested sheet, keep current in stack
    popSheet,       // pop: return to previous sheet in stack
    dismissAll,     // clear: close all sheets including stack
    onAnimationComplete,
    updateSheetProps,
    
    // Helpers
    isSheetOpen: (type) => state.activeSheet === type,
  };

  return (
    <SheetContext.Provider value={value}>
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet() {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('useSheet must be used within SheetProvider');
  }
  return context;
}

// Convenience hooks for specific sheets
export function useProfileSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.PROFILE, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.PROFILE),
    props: sheetProps,
  };
}

export function useEventSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.EVENT, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.EVENT),
    props: sheetProps,
  };
}

export function useChatSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.CHAT, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.CHAT),
    props: sheetProps,
  };
}

export function useShopSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.SHOP, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.SHOP),
    props: sheetProps,
  };
}

export function useGhostedSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.GHOSTED, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.GHOSTED),
    props: sheetProps,
  };
}

export function useVaultSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.VAULT, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.VAULT),
    props: sheetProps,
  };
}

export function useSocialSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.SOCIAL, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.SOCIAL),
    props: sheetProps,
  };
}

export function useEventsSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.EVENTS, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.EVENTS),
    props: sheetProps,
  };
}

export function useMarketplaceSheet() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  return {
    open: (props) => openSheet(SHEET_TYPES.MARKETPLACE, props),
    close: closeSheet,
    isOpen: isSheetOpen(SHEET_TYPES.MARKETPLACE),
    props: sheetProps,
  };
}

export default SheetContext;

