/**
 * OS Runtime Type Definitions
 * 
 * Core types for the HOTMESS OS-grade runtime.
 * Defines strict state machine modes, transitions, and state shape.
 */

/**
 * Core OS Modes (Finite State Machine)
 */
export type Mode =
  | "boot"      // Initial boot sequence
  | "idle"      // Default state - Globe visible, no overlays
  | "sheet"     // Sheet overlay active (market, pulse, chat, etc.)
  | "thread"    // Thread/conversation view (over sheet)
  | "interrupt" // System interrupt (SOS, safety, critical alerts)

/**
 * Sheet Types - Specific overlay contexts
 */
export type SheetType =
  | "grid"       // Profile grid discovery
  | "pulse"      // Events/beacons feed
  | "market"     // Marketplace/shop
  | "chat"       // Messages overview
  | "stack"      // Profile card stack
  | "radio"      // Radio player/schedule
  | "care"       // Aftercare resources
  | "affiliate"  // Affiliate program
  | "profile"    // User profile view
  | "event"      // Event detail
  | "vault"      // Order history
  | "shop"       // Shop detail
  | "ghosted"    // Ghosted content
  | "product"    // Product detail

/**
 * Interrupt Types - System-level overrides
 */
export type InterruptType =
  | "sos"        // SOS safety interrupt
  | "safety"     // Safety alert/warning
  | "age-gate"   // Age verification required
  | "onboarding" // Onboarding flow
  | "auth"       // Authentication required
  | "verification" // Account verification

/**
 * Complete OS State Shape
 */
export interface OSState {
  mode: Mode
  sheet?: SheetType
  sheetProps?: Record<string, any>
  threadId?: string
  interrupt?: InterruptType
  interruptProps?: Record<string, any>
  previous?: OSState | null
  
  // Metadata
  timestamp?: number
  transitionCount?: number
}

/**
 * Moderation State
 * Silent system layer for user trust/safety
 */
export interface ModerationState {
  strikes: number
  restricted: boolean
  cooldownUntil?: number
  lastViolation?: string
  restrictionReason?: string
}

/**
 * Trust/Reputation Metadata
 * Predictive safety and ranking
 */
export interface TrustMeta {
  responseRate: number       // 0-1: % of messages responded to
  reliabilityScore: number   // 0-1: composite trust score
  verified: boolean          // Manual verification status
  noShowCount: number        // Event RSVP no-shows
  reportCount: number        // Times reported by others
  lastActive?: number        // Unix timestamp
}

/**
 * Transition Rules Matrix
 * Defines valid state transitions
 */
export const VALID_TRANSITIONS: Record<Mode, Mode[]> = {
  boot: ["idle"],                          // Boot can only go to idle
  idle: ["sheet", "interrupt"],            // Idle can open sheet or interrupt
  sheet: ["idle", "thread", "interrupt"],  // Sheet can close, open thread, or be interrupted
  thread: ["sheet", "interrupt"],          // Thread can go back to sheet or be interrupted
  interrupt: ["boot", "idle", "sheet", "thread"], // Interrupt can restore to any (via previous)
}

/**
 * Z-Index Priority Layers
 * Visual stacking order (never overlap incorrectly)
 */
export const Z_LAYERS = {
  GLOBE: 0,
  HUD: 50,
  SHEET: 80,
  INTERRUPT: 100,
} as const

/**
 * Microcopy Constants
 * In-app voice and alt text
 */
export const MICROCOPY = {
  tagline: "HOTMESS Globe Runtime — one surface, many states. Sheets reveal. SOS overrides.",
  sheets: "Sheets don't navigate. They reveal.",
  globe: "Globe stays alive.",
  interrupts: "Interrupts restore context.",
  wipe: "Wipe means wipe.",
  
  // Alt text
  globeAlt: "Persistent abstract globe with live beacons behind OS layers.",
  sosAlt: "Fullscreen safety interrupt with actions and PIN-cancel.",
  
  // HUD labels
  hudLabels: {
    grid: "GRID",
    pulse: "PULSE",
    market: "MARKET",
    chat: "CHAT",
    stack: "STACK",
    sos: "SOS",
  },
} as const
