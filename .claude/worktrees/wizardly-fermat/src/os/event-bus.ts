/**
 * Event Bus
 * 
 * Centralized side effects and event handling.
 * Prevents scattered logic across components.
 */

type EventHandler<T = any> = (data: T) => void

interface EventBus {
  on: <T = any>(event: string, handler: EventHandler<T>) => () => void
  off: <T = any>(event: string, handler: EventHandler<T>) => void
  emit: <T = any>(event: string, data?: T) => void
  once: <T = any>(event: string, handler: EventHandler<T>) => () => void
}

/**
 * System Events
 */
export const SYSTEM_EVENTS = {
  // Presence
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  
  // Chat
  CHAT_NEW: 'chat:new',
  CHAT_READ: 'chat:read',
  CHAT_TYPING: 'chat:typing',
  
  // Pulse/Events
  PULSE_NEW: 'pulse:new',
  PULSE_UPDATE: 'pulse:update',
  PULSE_RSVP: 'pulse:rsvp',
  
  // SOS/Safety
  SOS_ARMED: 'sos:armed',
  SOS_TRIGGERED: 'sos:triggered',
  SOS_CANCELED: 'sos:canceled',
  
  // System
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  NETWORK_ONLINE: 'network:online',
  NETWORK_OFFLINE: 'network:offline',
  
  // User actions
  USER_REPORT: 'user:report',
  USER_BLOCK: 'user:block',
  USER_VERIFY: 'user:verify',
} as const

/**
 * Create an event bus instance
 */
function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>()

  const on = <T = any>(event: string, handler: EventHandler<T>) => {
    if (!handlers.has(event)) {
      handlers.set(event, new Set())
    }
    handlers.get(event)!.add(handler)

    // Return unsubscribe function
    return () => off(event, handler)
  }

  const off = <T = any>(event: string, handler: EventHandler<T>) => {
    const eventHandlers = handlers.get(event)
    if (eventHandlers) {
      eventHandlers.delete(handler)
      if (eventHandlers.size === 0) {
        handlers.delete(event)
      }
    }
  }

  const emit = <T = any>(event: string, data?: T) => {
    const eventHandlers = handlers.get(event)
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data)
        } catch (err) {
          console.error(`[EventBus] Error in handler for ${event}:`, err)
        }
      })
    }
  }

  const once = <T = any>(event: string, handler: EventHandler<T>) => {
    const wrappedHandler = (data: T) => {
      handler(data)
      off(event, wrappedHandler)
    }
    return on(event, wrappedHandler)
  }

  return { on, off, emit, once }
}

// Global event bus instance
export const eventBus = createEventBus()

/**
 * React hook for event subscriptions
 */
import { useEffect } from 'react'

export function useEventBus<T = any>(
  event: string,
  handler: EventHandler<T>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler)
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps])
}

/**
 * Hook for emitting events
 */
export function useEventEmitter() {
  return eventBus.emit
}

/**
 * Common event payload types
 */
export interface PresenceUpdatePayload {
  userId: string
  online: boolean
  lastSeen?: number
}

export interface ChatNewPayload {
  threadId: string
  from: string
  message: string
  timestamp: number
}

export interface PulseNewPayload {
  beaconId: string
  type: string
  title: string
}

export interface SOSPayload {
  userId: string
  location?: { lat: number; lng: number }
  timestamp: number
  pin?: string
}

export interface SystemErrorPayload {
  error: Error
  context?: string
  recoverable?: boolean
}
