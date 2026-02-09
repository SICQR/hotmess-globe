/**
 * HOTMESS OS — Core Module Index
 * 
 * Single import point for all core system functionality.
 */

// System State
export { 
  type SystemState,
  setSystemState,
  hydrateSystemState,
  useSystemState,
} from './systemState';

// Viewer State (boot)
export {
  type ViewerState,
  getViewerState,
  bootRouter,
  useViewerState,
  markAgeVerified,
  markConsentAccepted,
  markOnboardingComplete,
} from './viewerState';

// Navigation
export {
  type SystemMode,
  type OverlayType,
  useNavigation,
} from './navigation';

// Presence (TTL-based)
export {
  type PresenceMode,
  type PresenceRow,
  goLive,
  stopLive,
  extendLive,
  updateLiveLocation,
  getActivePresenceCount,
  getActivePresence,
  isCurrentUserLive,
  subscribeToPresence,
  usePresence,
} from './presence';

// Emergency
export {
  triggerPanic,
  resolveEmergency,
  scheduleFakeCall,
  useEmergency,
} from './emergency';

// Beacons
export {
  type BeaconType,
  type Beacon,
  type BeaconSources,
  subscribeBeacons,
  useBeacons,
  normalizePoint,
  intensityFromRow,
  beaconId,
  createRadioBeacon,
} from './beacons';

// Shaders
export {
  type ShaderUniforms,
  intensityToUniforms,
  distanceAttenuation,
  clusterIntensity,
  SHADER_VERTEX,
  SHADER_FRAGMENT,
  hexToRgb,
  rgbToHex,
} from './intensityToShaders';
