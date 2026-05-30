/**
 * OS Runtime - Main Exports
 * 
 * Central export point for the HOTMESS OS-grade runtime.
 */

// Types
export type { 
  Mode, 
  SheetType, 
  InterruptType, 
  OSState, 
  ModerationState, 
  TrustMeta 
} from './types'

export { 
  VALID_TRANSITIONS, 
  Z_LAYERS, 
  MICROCOPY 
} from './types'

// FSM
export {
  isValidTransition,
  validateTransition,
  createTransition,
  restoreFromInterrupt,
  wipeState,
  createInitialState,
} from './fsm'

// Store
export {
  OSProvider,
  useOS,
  useOSMode,
  useOSSheet,
  useOSThread,
  useOSInterrupt,
} from './store'

// URL Sync
export {
  useOSURLSync,
  createDeepLink,
  shareCurrentState,
} from './url-sync'

// Moderation
export {
  useModerationState,
  useTrustMeta,
  calculateRankScore,
} from './moderation'

// Event Bus
export {
  eventBus,
  useEventBus,
  useEventEmitter,
  SYSTEM_EVENTS,
} from './event-bus'

export type {
  PresenceUpdatePayload,
  ChatNewPayload,
  PulseNewPayload,
  SOSPayload,
  SystemErrorPayload,
} from './event-bus'
