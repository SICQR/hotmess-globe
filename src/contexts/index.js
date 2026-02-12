// ============================================================================
// HOTMESS Context Providers
// Two-layer signal system + personas + safety
// ============================================================================

// LAYER 1: World Pulse (Global · Ambient · Non-Clickable)
// Purpose: "The world is alive."
// - Abstract, poetic, anonymised
// - Drives globe atmosphere + glass feed
// - Background only, never identities
export { WorldPulseProvider, useWorldPulse, PULSE_TYPES as WORLD_PULSE_TYPES } from './WorldPulseContext';

// LAYER 2: Now Signals (Local · Contextual · Clickable)
// Purpose: "Something relevant to you is happening right now."
// - Context-aware, permissioned, sparse
// - Appears only when user is in relevant context
// - Actionable, time-bound
export { NowSignalProvider, useNowSignals, NOW_SIGNAL_TYPES, USER_CONTEXTS } from './NowSignalContext';

// Globe visualization modes
export { GlobeProvider, useGlobe, GLOBE_MODES } from './GlobeContext';

// Legacy Pulse (deprecated - use WorldPulse + NowSignals)
export { PulseProvider, usePulse, PULSE_TYPES } from './PulseContext';

// Persona switching (presentation only, no permission bypass)
export { PersonaProvider, usePersona, PERSONA_TYPES } from './PersonaContext';

// Safety gates (consent enforcement)
export { SafetyGateProvider, useSafetyGate, GATE_TYPES } from './SafetyGateContext';

// HotMess OS Integration - Vault (Unified Inventory)
export { VaultProvider, useVault } from './VaultContext';
