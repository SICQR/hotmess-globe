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

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  // Open a sheet
  const openSheet = useCallback((type, props = {}) => {
    dispatch({ type: 'OPEN_SHEET', payload: { type, props } });
  }, []);

  // Close the active sheet
  const closeSheet = useCallback(() => {
    dispatch({ type: 'CLOSE_SHEET' });
  }, []);

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
  useEffect(() => {
    const sheetFromUrl = searchParams.get('sheet');
    
    if (sheetFromUrl && sheetFromUrl !== state.activeSheet) {
      // URL has sheet param but state doesn't match — open it
      const props = {};
      if (searchParams.get('id')) props.id = searchParams.get('id');
      if (searchParams.get('email')) props.email = searchParams.get('email');
      if (searchParams.get('thread')) props.thread = searchParams.get('thread');
      if (searchParams.get('handle')) props.handle = searchParams.get('handle');
      
      openSheet(sheetFromUrl, props);
    } else if (!sheetFromUrl && state.activeSheet) {
      // URL cleared (back button) — close sheet
      closeSheet();
    }
  }, [searchParams]);

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
