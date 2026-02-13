/**
 * OS Runtime Store
 * 
 * Central state management for the HOTMESS OS.
 * Uses React Context + useReducer for strict FSM control.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { OSState, SheetType, InterruptType } from './types'
import {
  validateTransition,
  createTransition,
  restoreFromInterrupt,
  wipeState,
  createInitialState,
} from './fsm'

type OSAction =
  | { type: 'TRANSITION'; payload: Partial<OSState> }
  | { type: 'OPEN_SHEET'; payload: { sheet: SheetType; props?: Record<string, any> } }
  | { type: 'CLOSE_SHEET' }
  | { type: 'OPEN_THREAD'; payload: { threadId: string } }
  | { type: 'CLOSE_THREAD' }
  | { type: 'OPEN_INTERRUPT'; payload: { interrupt: InterruptType; props?: Record<string, any> } }
  | { type: 'CLOSE_INTERRUPT' }
  | { type: 'WIPE' }
  | { type: 'GO_IDLE' }

function osReducer(state: OSState, action: OSAction): OSState {
  switch (action.type) {
    case 'TRANSITION': {
      const nextState = createTransition(state, action.payload)
      const validation = validateTransition(state, nextState)
      
      if (!validation.valid) {
        console.error('[OS FSM] Invalid transition:', validation.error)
        return state
      }
      
      return nextState
    }

    case 'OPEN_SHEET': {
      const nextState = createTransition(state, {
        mode: 'sheet',
        sheet: action.payload.sheet,
        sheetProps: action.payload.props,
      })
      
      const validation = validateTransition(state, nextState)
      if (!validation.valid) {
        console.error('[OS FSM] Invalid sheet transition:', validation.error)
        return state
      }
      
      return nextState
    }

    case 'CLOSE_SHEET': {
      const nextState = createTransition(state, {
        mode: 'idle',
        sheet: undefined,
        sheetProps: undefined,
      })
      
      return nextState
    }

    case 'OPEN_THREAD': {
      const nextState = createTransition(state, {
        mode: 'thread',
        threadId: action.payload.threadId,
      })
      
      const validation = validateTransition(state, nextState)
      if (!validation.valid) {
        console.error('[OS FSM] Invalid thread transition:', validation.error)
        return state
      }
      
      return nextState
    }

    case 'CLOSE_THREAD': {
      // Thread closes back to sheet if one exists
      if (state.sheet) {
        return createTransition(state, {
          mode: 'sheet',
          threadId: undefined,
        })
      }
      
      // Otherwise go to idle
      return createTransition(state, {
        mode: 'idle',
        threadId: undefined,
      })
    }

    case 'OPEN_INTERRUPT': {
      const nextState = createTransition(state, {
        mode: 'interrupt',
        interrupt: action.payload.interrupt,
        interruptProps: action.payload.props,
      })
      
      return nextState
    }

    case 'CLOSE_INTERRUPT': {
      return restoreFromInterrupt(state)
    }

    case 'WIPE': {
      return wipeState()
    }

    case 'GO_IDLE': {
      return createTransition(state, {
        mode: 'idle',
        sheet: undefined,
        sheetProps: undefined,
        threadId: undefined,
      })
    }

    default:
      return state
  }
}

interface OSContextValue {
  state: OSState
  
  // Actions
  openSheet: (sheet: SheetType, props?: Record<string, any>) => void
  closeSheet: () => void
  openThread: (threadId: string) => void
  closeThread: () => void
  openInterrupt: (interrupt: InterruptType, props?: Record<string, any>) => void
  closeInterrupt: () => void
  goIdle: () => void
  wipe: () => void
  
  // Helpers
  isMode: (mode: OSState['mode']) => boolean
  isSheet: (sheet: SheetType) => boolean
  isInterrupt: (interrupt: InterruptType) => boolean
}

const OSContext = createContext<OSContextValue | null>(null)

export function OSProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(osReducer, undefined, createInitialState)

  // Actions
  const openSheet = useCallback((sheet: SheetType, props?: Record<string, any>) => {
    dispatch({ type: 'OPEN_SHEET', payload: { sheet, props } })
  }, [])

  const closeSheet = useCallback(() => {
    dispatch({ type: 'CLOSE_SHEET' })
  }, [])

  const openThread = useCallback((threadId: string) => {
    dispatch({ type: 'OPEN_THREAD', payload: { threadId } })
  }, [])

  const closeThread = useCallback(() => {
    dispatch({ type: 'CLOSE_THREAD' })
  }, [])

  const openInterrupt = useCallback((interrupt: InterruptType, props?: Record<string, any>) => {
    dispatch({ type: 'OPEN_INTERRUPT', payload: { interrupt, props } })
  }, [])

  const closeInterrupt = useCallback(() => {
    dispatch({ type: 'CLOSE_INTERRUPT' })
  }, [])

  const goIdle = useCallback(() => {
    dispatch({ type: 'GO_IDLE' })
  }, [])

  const wipe = useCallback(() => {
    dispatch({ type: 'WIPE' })
  }, [])

  // Helpers
  const isMode = useCallback((mode: OSState['mode']) => {
    return state.mode === mode
  }, [state.mode])

  const isSheet = useCallback((sheet: SheetType) => {
    return state.mode === 'sheet' && state.sheet === sheet
  }, [state.mode, state.sheet])

  const isInterrupt = useCallback((interrupt: InterruptType) => {
    return state.mode === 'interrupt' && state.interrupt === interrupt
  }, [state.mode, state.interrupt])

  // Auto-transition from boot to idle after initialization
  // The 100ms delay ensures initial render completes and allows time for
  // provider tree to stabilize before transitioning to idle
  useEffect(() => {
    if (state.mode === 'boot') {
      const timer = setTimeout(() => {
        dispatch({ type: 'GO_IDLE' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [state.mode])

  const value: OSContextValue = {
    state,
    openSheet,
    closeSheet,
    openThread,
    closeThread,
    openInterrupt,
    closeInterrupt,
    goIdle,
    wipe,
    isMode,
    isSheet,
    isInterrupt,
  }

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>
}

export function useOS() {
  const context = useContext(OSContext)
  if (!context) {
    throw new Error('useOS must be used within OSProvider')
  }
  return context
}

// Convenience hooks
export function useOSMode() {
  const { state } = useOS()
  return state.mode
}

export function useOSSheet() {
  const { state, openSheet, closeSheet } = useOS()
  return {
    sheet: state.sheet,
    props: state.sheetProps,
    isOpen: state.mode === 'sheet',
    open: openSheet,
    close: closeSheet,
  }
}

export function useOSThread() {
  const { state, openThread, closeThread } = useOS()
  return {
    threadId: state.threadId,
    isOpen: state.mode === 'thread',
    open: openThread,
    close: closeThread,
  }
}

export function useOSInterrupt() {
  const { state, openInterrupt, closeInterrupt } = useOS()
  return {
    interrupt: state.interrupt,
    props: state.interruptProps,
    isOpen: state.mode === 'interrupt',
    open: openInterrupt,
    close: closeInterrupt,
  }
}
