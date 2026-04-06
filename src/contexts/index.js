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

// Globe visualization modes
export { GlobeProvider, useGlobe, GLOBE_MODES } from './GlobeContext';

// Legacy Pulse (deprecated - use WorldPulse + NowSignals)
export { PulseProvider, usePulse, PULSE_TYPES } from './PulseContext';

// Persona switching (presentation only, no permission bypass)
export { PersonaProvider, usePersona, PERSONA_TYPES } from './PersonaContext';

// Safety gates (consent enforcement)
export { SafetyGateProvider, useSafetyGate, GATE_TYPES } from './SafetyGateContext';
