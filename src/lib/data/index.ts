/**
 * Data Domain Layer Index
 * 
 * Central export for all domain data modules.
 * UI components should import from here, not directly from Supabase.
 */

// Profiles
export * from './profiles';
export { 
  getCurrentProfile,
  getProfileById,
  getProfiles,
  getNearbyProfiles,
  updateProfile,
  updatePresence,
  subscribeToProfile,
  subscribeToProfiles,
} from './profiles';
export type { Profile, ProfileFilters } from './profiles';

// Presence
export * from './presence';
export {
  startPresence,
  stopPresence,
  updateLocation,
  getOnlineCount,
  getBeacons as getPresenceBeacons,
  createBeacon as createPresenceBeacon,
  deleteBeacon as deletePresenceBeacon,
  subscribeToBeacons as subscribeToPresenceBeacons,
} from './presence';
export type { PresenceState, PresenceBeacon } from './presence';

// Market (Unified Commerce)
export * from './market';
export {
  getAllProducts,
  getProductById,
  getProductsByBrand,
  getPrelovedProducts,
  getShopifyProducts,
  getCategories,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
} from './market';
export type { Product, ProductVariant, ProductFilters, CreateListingInput } from './market';

// Radio
export * from './radio';
export {
  getRadioState,
  getSchedule,
  getTodaySchedule,
  getShowById,
  joinAsListener,
  leaveAsListener,
  subscribeToRadioState,
} from './radio';
export type { RadioShow, RadioState, RadioScheduleDay } from './radio';

// Beacons (Events, Safety, Venues)
export * from './beacons';
export {
  getBeacons,
  getBeaconById,
  getEvents,
  getUpcomingEvents,
  getEventsByOrganizer,
  getSafetyAlerts,
  reportSafetyConcern,
  createBeacon,
  updateBeacon,
  deleteBeacon,
  subscribeToBeacons,
} from './beacons';
export type { Beacon, BeaconType, Event, SafetyAlert, BeaconFilters, CreateBeaconInput } from './beacons';
