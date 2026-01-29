/**
 * HOTMESS Route Configuration
 * 
 * Simplified, clean route structure.
 * All routes follow a consistent pattern.
 */

export const ROUTES = {
  // ========================================
  // MAIN NAV (Bottom tabs)
  // ========================================
  home: '/',
  pulse: '/pulse',
  events: '/events',
  market: '/market',
  social: '/social',
  music: '/music',
  more: '/more',

  // ========================================
  // AUTH
  // ========================================
  auth: '/auth',
  onboarding: '/onboarding',
  age: '/age',

  // ========================================
  // PROFILE & SETTINGS
  // ========================================
  profile: '/profile',          // ?email=x or ?uid=x for others
  editProfile: '/profile/edit',
  settings: '/settings',
  membership: '/membership',
  pricing: '/pricing',

  // ========================================
  // EVENTS
  // ========================================
  eventDetail: '/events/:id',
  calendar: '/calendar',
  
  // ========================================
  // MARKET
  // ========================================
  marketCollection: '/market/:collection',
  product: '/market/p/:handle',
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
  
  // ========================================
  // SOCIAL
  // ========================================
  messages: '/messages',
  thread: '/messages/:threadId',
  userProfile: '/u/:id',        // Short URL for user profiles
  
  // ========================================
  // MUSIC
  // ========================================
  radio: '/music/live',
  radioSchedule: '/music/shows',
  
  // ========================================
  // MORE SECTION
  // ========================================
  beacons: '/beacons',
  beaconDetail: '/beacons/:id',
  beaconCreate: '/beacons/new',
  beaconEdit: '/beacons/:id/edit',
  safety: '/safety',
  care: '/care',
  scan: '/scan',
  leaderboard: '/leaderboard',
  community: '/community',
  bookmarks: '/saved',
  challenges: '/challenges',
  stats: '/stats',
  
  // ========================================
  // LEGAL
  // ========================================
  privacy: '/privacy',
  terms: '/terms',
  guidelines: '/guidelines',
  contact: '/contact',
  help: '/help',
  
  // ========================================
  // ACCOUNT
  // ========================================
  accountDelete: '/account/delete',
  accountExport: '/account/export',
  accountConsents: '/account/consents',
  
  // ========================================
  // ADMIN
  // ========================================
  admin: '/admin',
  
  // ========================================
  // BUSINESS
  // ========================================
  biz: '/biz',
  bizAnalytics: '/biz/analytics',
  bizOnboarding: '/biz/onboarding',
  
  // ========================================
  // FEATURES/USP PAGES
  // ========================================
  features: '/features',
  featuresSafety: '/features/safety',
  featuresEvents: '/features/events',
  featuresSocial: '/features/social',
  featuresMusic: '/features/music',
  featuresPersonas: '/features/personas',
};

/**
 * Route to Page Component mapping
 */
export const ROUTE_PAGES = {
  '/': 'Home',
  '/pulse': 'Pulse',
  '/events': 'Events',
  '/social': 'Social',
  '/music': 'Music',
  '/more': 'More',
  '/auth': 'Auth',
  '/onboarding': 'Onboarding',
  '/age': 'AgeGate',
  '/profile': 'Profile',
  '/profile/edit': 'EditProfile',
  '/settings': 'Settings',
  '/membership': 'MembershipUpgrade',
  '/pricing': 'Pricing',
  '/calendar': 'Calendar',
  '/messages': 'Messages',
  '/beacons': 'Beacons',
  '/beacons/new': 'CreateBeacon',
  '/safety': 'Safety',
  '/care': 'Care',
  '/scan': 'Scan',
  '/leaderboard': 'Leaderboard',
  '/community': 'Community',
  '/saved': 'Bookmarks',
  '/challenges': 'Challenges',
  '/stats': 'Stats',
  '/privacy': 'PrivacyPolicy',
  '/terms': 'TermsOfService',
  '/guidelines': 'CommunityGuidelines',
  '/contact': 'Contact',
  '/help': 'HelpCenter',
  '/account/delete': 'AccountDeletion',
  '/account/export': 'DataExport',
  '/account/consents': 'AccountConsents',
  '/admin': 'AdminDashboard',
  '/biz': 'BusinessDashboard',
  '/biz/analytics': 'BusinessAnalytics',
  '/biz/onboarding': 'BusinessOnboarding',
  '/features': 'Features',
  '/features/safety': 'SafetyFeatures',
  '/features/events': 'EventsFeatures',
  '/features/social': 'SocialFeatures',
  '/features/music': 'RadioFeatures',
  '/features/personas': 'PersonaFeatures',
};

/**
 * Legacy route redirects
 * Maps old URLs to new canonical URLs
 */
export const LEGACY_REDIRECTS = {
  '/connect': '/social',
  '/marketplace': '/market',
  '/radio': '/music/live',
  '/radio/schedule': '/music/shows',
  '/shop': '/market',
  '/profiles': '/social',
  '/Marketplace': '/market',
  '/Radio': '/music/live',
  '/Connect': '/social',
  '/account': '/settings',
  '/account/profile': '/profile/edit',
  '/account/membership': '/membership',
  '/account/upgrade': '/membership',
  '/notifications': '/settings',
  '/upgrade': '/membership',
  '/legal': '/privacy',
  '/legal/privacy': '/privacy',
  '/legal/terms': '/terms',
};

/**
 * Routes that require authentication
 */
export const PROTECTED_ROUTES = [
  '/profile/edit',
  '/settings',
  '/membership',
  '/messages',
  '/beacons/new',
  '/saved',
  '/orders',
  '/checkout',
  '/account/delete',
  '/account/export',
  '/account/consents',
  '/admin',
  '/biz',
];

/**
 * Routes that don't need the layout wrapper
 */
export const NO_LAYOUT_ROUTES = [
  '/auth',
  '/onboarding',
  '/age',
];

export default ROUTES;
