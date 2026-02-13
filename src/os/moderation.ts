/**
 * Moderation Engine
 * 
 * Silent system layer for user trust and safety.
 * Handles strikes, restrictions, cooldowns, and reputation.
 */

import { useState, useCallback, useEffect } from 'react'
import type { ModerationState, TrustMeta } from './types'

const MODERATION_KEY = 'hm_moderation_v1'
const TRUST_KEY = 'hm_trust_v1'

const STRIKE_THRESHOLD = 3
const COOLDOWN_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Load moderation state from storage
 */
function loadModerationState(): ModerationState {
  try {
    const stored = localStorage.getItem(MODERATION_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      
      // Check if cooldown has expired
      if (parsed.cooldownUntil && Date.now() > parsed.cooldownUntil) {
        return {
          strikes: 0,
          restricted: false,
        }
      }
      
      return parsed
    }
  } catch (err) {
    console.error('[Moderation] Failed to load state:', err)
  }

  return {
    strikes: 0,
    restricted: false,
  }
}

/**
 * Save moderation state to storage
 */
function saveModerationState(state: ModerationState) {
  try {
    localStorage.setItem(MODERATION_KEY, JSON.stringify(state))
  } catch (err) {
    console.error('[Moderation] Failed to save state:', err)
  }
}

/**
 * Load trust metadata
 */
function loadTrustMeta(): TrustMeta {
  try {
    const stored = localStorage.getItem(TRUST_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (err) {
    console.error('[Moderation] Failed to load trust meta:', err)
  }

  return {
    responseRate: 0.5,
    reliabilityScore: 0.5,
    verified: false,
    noShowCount: 0,
    reportCount: 0,
  }
}

/**
 * Save trust metadata
 */
function saveTrustMeta(meta: TrustMeta) {
  try {
    localStorage.setItem(TRUST_KEY, JSON.stringify(meta))
  } catch (err) {
    console.error('[Moderation] Failed to save trust meta:', err)
  }
}

/**
 * Hook for moderation state management
 */
export function useModerationState() {
  const [moderation, setModeration] = useState<ModerationState>(loadModerationState)

  // Add a strike
  const addStrike = useCallback((reason?: string) => {
    setModeration(prev => {
      const newStrikes = prev.strikes + 1
      const isRestricted = newStrikes >= STRIKE_THRESHOLD
      
      const newState: ModerationState = {
        strikes: newStrikes,
        restricted: isRestricted,
        lastViolation: reason,
        restrictionReason: isRestricted ? reason : undefined,
        cooldownUntil: isRestricted ? Date.now() + COOLDOWN_DURATION : undefined,
      }

      saveModerationState(newState)
      return newState
    })
  }, [])

  // Clear strikes (admin action)
  const clearStrikes = useCallback(() => {
    const newState: ModerationState = {
      strikes: 0,
      restricted: false,
    }
    saveModerationState(newState)
    setModeration(newState)
  }, [])

  // Check if cooldown has expired
  useEffect(() => {
    if (moderation.cooldownUntil && Date.now() > moderation.cooldownUntil) {
      clearStrikes()
    }
  }, [moderation.cooldownUntil, clearStrikes])

  return {
    moderation,
    addStrike,
    clearStrikes,
    isRestricted: moderation.restricted,
    strikeCount: moderation.strikes,
    cooldownRemaining: moderation.cooldownUntil 
      ? Math.max(0, moderation.cooldownUntil - Date.now())
      : 0,
  }
}

/**
 * Hook for trust/reputation management
 */
export function useTrustMeta() {
  const [trust, setTrust] = useState<TrustMeta>(loadTrustMeta)

  // Update response rate
  const updateResponseRate = useCallback((rate: number) => {
    setTrust(prev => {
      const newTrust = { ...prev, responseRate: Math.max(0, Math.min(1, rate)) }
      saveTrustMeta(newTrust)
      return newTrust
    })
  }, [])

  // Record a no-show
  const recordNoShow = useCallback(() => {
    setTrust(prev => {
      const newTrust = {
        ...prev,
        noShowCount: prev.noShowCount + 1,
        reliabilityScore: Math.max(0, prev.reliabilityScore - 0.1),
      }
      saveTrustMeta(newTrust)
      return newTrust
    })
  }, [])

  // Record a report
  const recordReport = useCallback(() => {
    setTrust(prev => {
      const newTrust = {
        ...prev,
        reportCount: prev.reportCount + 1,
        reliabilityScore: Math.max(0, prev.reliabilityScore - 0.15),
      }
      saveTrustMeta(newTrust)
      return newTrust
    })
  }, [])

  // Mark as verified
  const markVerified = useCallback((verified: boolean) => {
    setTrust(prev => {
      const newTrust = { ...prev, verified }
      saveTrustMeta(newTrust)
      return newTrust
    })
  }, [])

  // Update last active timestamp
  const updateLastActive = useCallback(() => {
    setTrust(prev => {
      const newTrust = { ...prev, lastActive: Date.now() }
      saveTrustMeta(newTrust)
      return newTrust
    })
  }, [])

  return {
    trust,
    updateResponseRate,
    recordNoShow,
    recordReport,
    markVerified,
    updateLastActive,
  }
}

/**
 * Calculate ranking score for profile discovery
 */
export function calculateRankScore(
  trust: TrustMeta,
  distance: number,
  isOnline: boolean,
  weights: {
    distance: number
    online: number
    verified: number
    trust: number
    randomDelta: number
  } = {
    distance: 0.3,
    online: 0.2,
    verified: 0.2,
    trust: 0.2,
    randomDelta: 0.1,
  }
): number {
  const distanceScore = 1 - Math.min(1, distance / 100) // Normalize distance to 0-1
  const onlineScore = isOnline ? 1 : 0
  const verifiedBoost = trust.verified ? 1 : 0
  const trustScore = trust.reliabilityScore
  const randomness = Math.random() * 2 - 1 // -1 to 1

  const score =
    distanceScore * weights.distance +
    onlineScore * weights.online +
    verifiedBoost * weights.verified +
    trustScore * weights.trust +
    randomness * weights.randomDelta

  return Math.max(0, Math.min(1, score))
}
