/**
 * Finite State Machine (FSM) Engine
 * 
 * Enforces strict state transitions for the OS runtime.
 * No ambiguous state changes allowed.
 */

import type { OSState, Mode } from './types'
import { VALID_TRANSITIONS } from './types'

/**
 * Validate if a transition is allowed
 */
export function isValidTransition(from: Mode, to: Mode): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Validate a complete state transition
 */
export function validateTransition(current: OSState, next: OSState): {
  valid: boolean
  error?: string
} {
  // Special case: interrupt can go anywhere via restoration
  if (next.mode === 'interrupt') {
    if (!next.interrupt) {
      return { valid: false, error: 'Interrupt mode requires interrupt type' }
    }
    return { valid: true }
  }

  // Check if transition is allowed
  if (!isValidTransition(current.mode, next.mode)) {
    return {
      valid: false,
      error: `Invalid transition: ${current.mode} → ${next.mode}`
    }
  }

  // Validate mode-specific requirements
  if (next.mode === 'sheet' && !next.sheet) {
    return { valid: false, error: 'Sheet mode requires sheet type' }
  }
  
  if (next.mode === 'thread' && !next.threadId) {
    return { valid: false, error: 'Thread mode requires threadId' }
  }

  return { valid: true }
}

/**
 * Create a transition with previous state captured
 */
export function createTransition(
  current: OSState,
  next: Partial<OSState>
): OSState {
  const newState: OSState = {
    ...next,
    mode: next.mode || current.mode,
    timestamp: Date.now(),
    transitionCount: (current.transitionCount || 0) + 1,
  }

  // If transitioning to interrupt, capture previous state
  if (newState.mode === 'interrupt') {
    newState.previous = { ...current }
  }

  return newState
}

/**
 * Restore from interrupt to previous state
 */
export function restoreFromInterrupt(current: OSState): OSState {
  if (current.mode !== 'interrupt') {
    throw new Error('Can only restore from interrupt mode')
  }

  if (!current.previous) {
    // No previous state - go to idle
    return {
      mode: 'idle',
      timestamp: Date.now(),
      transitionCount: (current.transitionCount || 0) + 1,
    }
  }

  // Restore previous state
  return {
    ...current.previous,
    timestamp: Date.now(),
    transitionCount: (current.transitionCount || 0) + 1,
  }
}

/**
 * Wipe state and return to boot
 */
export function wipeState(): OSState {
  return {
    mode: 'boot',
    timestamp: Date.now(),
    transitionCount: 0,
  }
}

/**
 * Create initial state
 */
export function createInitialState(): OSState {
  return {
    mode: 'boot',
    timestamp: Date.now(),
    transitionCount: 0,
  }
}
