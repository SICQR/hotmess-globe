/**
 * URL ↔ State Synchronization
 * 
 * Deep linking without routing.
 * Syncs OS state with URL search params bidirectionally.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useOS } from './store'
import type { SheetType } from './types'

/**
 * Hook to sync OS state with URL search params
 * 
 * State → URL: Updates URL when state changes
 * URL → State: Hydrates state from URL on mount and browser navigation
 */
export function useOSURLSync() {
  const { state, openSheet, openThread, closeSheet, closeThread } = useOS()
  const isInitialMount = useRef(true)
  const isUpdatingFromURL = useRef(false)
  // Guard: don't clear URL params until we've had a chance to hydrate state from them
  const hasHydrated = useRef(false)

  // State → URL sync
  useEffect(() => {
    // Skip if we're currently updating from URL to avoid loops
    if (isUpdatingFromURL.current) return
    // Don't clear URL params on initial render — let hydrateFromURL read them first
    if (!hasHydrated.current) return

    const params = new URLSearchParams(window.location.search)
    let changed = false

    // Handle sheet mode
    if (state.mode === 'sheet' && state.sheet) {
      if (params.get('sheet') !== state.sheet) {
        params.set('sheet', state.sheet)
        changed = true
      }

      // Add sheet props to URL
      if (state.sheetProps) {
        Object.entries(state.sheetProps).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            if (params.get(key) !== value) {
              params.set(key, value)
              changed = true
            }
          }
        })
      }

      // Clear thread param if not in thread mode
      if (params.has('thread')) {
        params.delete('thread')
        changed = true
      }
    }
    // Handle thread mode
    else if (state.mode === 'thread' && state.threadId) {
      if (params.get('thread') !== state.threadId) {
        params.set('thread', state.threadId)
        changed = true
      }

      // Keep sheet param if we came from a sheet
      if (state.sheet && params.get('sheet') !== state.sheet) {
        params.set('sheet', state.sheet)
        changed = true
      }
    }
    // Handle idle/boot/interrupt modes
    else {
      // Clear all state params
      if (params.has('sheet')) {
        params.delete('sheet')
        changed = true
      }
      if (params.has('thread')) {
        params.delete('thread')
        changed = true
      }
      // Clear common prop params
      ['id', 'email', 'handle', 'productId', 'eventId'].forEach(key => {
        if (params.has(key)) {
          params.delete(key)
          changed = true
        }
      })
    }

    // Update URL if changed
    if (changed) {
      const newURL = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      
      window.history.replaceState({}, '', newURL)
    }
  }, [state.mode, state.sheet, state.threadId, state.sheetProps])

  // URL → State sync (on mount and browser navigation)
  const hydrateFromURL = useCallback(() => {
    isUpdatingFromURL.current = true
    hasHydrated.current = true // Allow State→URL sync to run after this

    const params = new URLSearchParams(window.location.search)
    const sheetParam = params.get('sheet') as SheetType | null
    const threadParam = params.get('thread')

    // Don't hydrate if already in an interrupt
    if (state.mode === 'interrupt') {
      isUpdatingFromURL.current = false
      return
    }

    // Hydrate thread
    if (threadParam && state.threadId !== threadParam) {
      openThread(threadParam)
    }
    // Hydrate sheet
    else if (sheetParam && (state.mode !== 'sheet' || state.sheet !== sheetParam)) {
      const props: Record<string, any> = {}
      
      // Extract common props from URL
      if (params.get('id')) props.id = params.get('id')
      if (params.get('email')) props.email = params.get('email')
      if (params.get('handle')) props.handle = params.get('handle')
      if (params.get('productId')) props.productId = params.get('productId')
      if (params.get('eventId')) props.eventId = params.get('eventId')

      openSheet(sheetParam, props)
    }
    // Clear state if no params
    else if (!sheetParam && !threadParam && state.mode !== 'idle' && state.mode !== 'boot') {
      if (state.mode === 'thread') {
        closeThread()
      } else if (state.mode === 'sheet') {
        closeSheet()
      }
    }

    isUpdatingFromURL.current = false
  }, [state.mode, state.sheet, state.threadId, openSheet, openThread, closeSheet, closeThread])

  useEffect(() => {
    // Hydrate on mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      hydrateFromURL()
    }

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', hydrateFromURL)
    return () => window.removeEventListener('popstate', hydrateFromURL)
  }, [hydrateFromURL])
}

/**
 * Helper to create deep link URLs
 */
export function createDeepLink(
  sheet: SheetType,
  props?: Record<string, string>
): string {
  const params = new URLSearchParams()
  params.set('sheet', sheet)
  
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
  }

  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

/**
 * Helper to share current state as URL
 */
export function shareCurrentState(): string {
  return window.location.href
}
