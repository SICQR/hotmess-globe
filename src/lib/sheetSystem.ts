/**
 * HOTMESS Sheet System — Rules, Laws & Timing
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SHEET HIERARCHY (Z-Index Layers)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * L0: Globe (z-0)           — Always visible, never unmounts
 * L1: HUD (z-50)            — Bottom nav, status indicators
 * L2: Sheets (z-80)         — Slide-up content panels
 * L3: Interrupts (z-100)    — Toasts, alerts, confirmations
 * L4: PIN Lock (z-200)      — Security overlay
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SHEET LAWS (Immutable Rules)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * LAW 1: SINGLE AUTHORITY
 *   - SheetContext is the ONLY sheet state owner
 *   - No component may maintain independent sheet state
 *   - All sheet operations go through useSheet() hook
 * 
 * LAW 2: LIFO STACK
 *   - Sheets follow Last-In-First-Out ordering
 *   - Back button ALWAYS pops top sheet before route
 *   - No parallel sheets (one active at a time, stack for history)
 * 
 * LAW 3: URL SYNC
 *   - Active sheet type syncs to ?sheet=<type> param
 *   - Sheet props sync to URL for deep linking (id, email, handle)
 *   - URL changes trigger sheet state changes (bidirectional)
 * 
 * LAW 4: NO REMOUNT
 *   - Opening a sheet does NOT remount the globe
 *   - Closing a sheet does NOT remount the globe
 *   - Sheet animations are CSS/Framer only, no React unmount
 * 
 * LAW 5: DETERMINISTIC CLOSE
 *   - Swipe down > 100px OR velocity > 500px/s = close
 *   - Tap backdrop = close
 *   - Press Escape = close
 *   - Browser back = close (via popstate)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * ANIMATION TIMING (Constants)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Spring physics for sheet animations
export const SHEET_SPRING = {
  damping: 30,
  stiffness: 300,
  mass: 0.8,
} as const;

// Backdrop fade timing
export const BACKDROP_TIMING = {
  enter: 200,  // ms
  exit: 150,   // ms
} as const;

// Swipe thresholds
export const SWIPE = {
  distanceThreshold: 100,   // px - drag distance to trigger close
  velocityThreshold: 500,   // px/s - velocity to trigger close
  elasticity: 0.5,          // bounce factor when dragging past bounds
} as const;

// Sheet heights by type
export const SHEET_HEIGHTS = {
  full: '95vh',
  large: '90vh',
  medium: '85vh',
  small: '70vh',
  mini: '50vh',
} as const;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SHEET TYPES REGISTRY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Each sheet type has:
 *   - id: URL-safe kebab-case identifier
 *   - title: Display name (can be overridden by props)
 *   - height: Default height from SHEET_HEIGHTS
 *   - auth: Whether auth is required
 *   - props: Expected prop types for the sheet
 */

export interface SheetDefinition {
  id: string;
  title: string;
  height: keyof typeof SHEET_HEIGHTS;
  auth: boolean;
  deepLinkParams: string[];
}

export const SHEET_REGISTRY: Record<string, SheetDefinition> = {
  // ─────────────────────────────────────────────────────────────────────────
  // CORE SHEETS (fully implemented)
  // ─────────────────────────────────────────────────────────────────────────
  'profile': {
    id: 'profile',
    title: 'Profile',
    height: 'medium',
    auth: false,
    deepLinkParams: ['id', 'email', 'handle'],
  },
  'event': {
    id: 'event',
    title: 'Event',
    height: 'large',
    auth: false,
    deepLinkParams: ['id'],
  },
  'chat': {
    id: 'chat',
    title: 'Messages',
    height: 'large',
    auth: true,
    deepLinkParams: ['thread', 'recipientId'],
  },
  'vault': {
    id: 'vault',
    title: 'Vault',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'shop': {
    id: 'shop',
    title: 'Shop',
    height: 'large',
    auth: false,
    deepLinkParams: [],
  },
  'ghosted': {
    id: 'ghosted',
    title: 'Right Now',
    height: 'medium',
    auth: false,
    deepLinkParams: [],
  },
  'social': {
    id: 'social',
    title: 'Social',
    height: 'large',
    auth: true,
    deepLinkParams: [],
  },
  'events': {
    id: 'events',
    title: 'Events',
    height: 'large',
    auth: false,
    deepLinkParams: [],
  },
  'marketplace': {
    id: 'marketplace',
    title: 'Market',
    height: 'large',
    auth: false,
    deepLinkParams: ['category', 'q'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCT & CART
  // ─────────────────────────────────────────────────────────────────────────
  'product': {
    id: 'product',
    title: 'Product',
    height: 'large',
    auth: false,
    deepLinkParams: ['productId'],
  },
  'cart': {
    id: 'cart',
    title: 'Cart',
    height: 'small',
    auth: false,
    deepLinkParams: [],
  },
  'filters': {
    id: 'filters',
    title: 'Filters',
    height: 'mini',
    auth: false,
    deepLinkParams: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  'edit-profile': {
    id: 'edit-profile',
    title: 'Edit Profile',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'photos': {
    id: 'photos',
    title: 'Photos',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'location': {
    id: 'location',
    title: 'Location',
    height: 'small',
    auth: true,
    deepLinkParams: [],
  },
  'safety': {
    id: 'safety',
    title: 'Safety Center',
    height: 'medium',
    auth: false,
    deepLinkParams: [],
  },
  'privacy': {
    id: 'privacy',
    title: 'Privacy',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'blocked': {
    id: 'blocked',
    title: 'Blocked Users',
    height: 'small',
    auth: true,
    deepLinkParams: [],
  },
  'favorites': {
    id: 'favorites',
    title: 'Favorites',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'my-listings': {
    id: 'my-listings',
    title: 'My Listings',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'membership': {
    id: 'membership',
    title: 'Membership',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'notifications': {
    id: 'notifications',
    title: 'Notifications',
    height: 'small',
    auth: true,
    deepLinkParams: [],
  },
  'settings': {
    id: 'settings',
    title: 'Settings',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'help': {
    id: 'help',
    title: 'Help & Support',
    height: 'medium',
    auth: false,
    deepLinkParams: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RADIO
  // ─────────────────────────────────────────────────────────────────────────
  'schedule': {
    id: 'schedule',
    title: 'Schedule',
    height: 'medium',
    auth: false,
    deepLinkParams: [],
  },
  'show': {
    id: 'show',
    title: 'Show',
    height: 'medium',
    auth: false,
    deepLinkParams: ['showId'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PULSE / BEACONS
  // ─────────────────────────────────────────────────────────────────────────
  'beacon': {
    id: 'beacon',
    title: 'Beacon',
    height: 'large',
    auth: true,
    deepLinkParams: ['beaconId'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SELLING / ONBOARDING / PAYOUTS
  // ─────────────────────────────────────────────────────────────────────────
  'sell': {
    id: 'sell',
    title: 'List an Item',
    height: 'large',
    auth: true,
    deepLinkParams: [],
  },
  'seller-onboarding': {
    id: 'seller-onboarding',
    title: 'Start Selling',
    height: 'large',
    auth: true,
    deepLinkParams: [],
  },
  'payouts': {
    id: 'payouts',
    title: 'Payouts',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
  'order': {
    id: 'order',
    title: 'Order',
    height: 'medium',
    auth: true,
    deepLinkParams: ['orderId'],
  },
  'my-orders': {
    id: 'my-orders',
    title: 'My Orders',
    height: 'large',
    auth: true,
    deepLinkParams: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY / HOME FEED
  // ─────────────────────────────────────────────────────────────────────────
  'search': {
    id: 'search',
    title: 'Search',
    height: 'large',
    auth: false,
    deepLinkParams: ['q'],
  },
  'directions': {
    id: 'directions',
    title: 'Directions',
    height: 'small',
    auth: false,
    deepLinkParams: ['lat', 'lng'],
  },
  'checkout': {
    id: 'checkout',
    title: 'Checkout',
    height: 'large',
    auth: true,
    deepLinkParams: ['id'],
  },
  'qr': {
    id: 'qr',
    title: 'QR Code',
    height: 'small',
    auth: true,
    deepLinkParams: ['orderId', 'ticketId'],
  },
  'create-event': {
    id: 'create-event',
    title: 'Create Event',
    height: 'large',
    auth: true,
    deepLinkParams: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SAFETY — EMERGENCY CONTACT
  // ─────────────────────────────────────────────────────────────────────────
  'emergency-contact': {
    id: 'emergency-contact',
    title: 'Emergency Contact',
    height: 'medium',
    auth: true,
    deepLinkParams: [],
  },
} as const;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SHEET OPERATIONS API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * openSheet(type, props)
 *   - Validates type against SHEET_REGISTRY
 *   - Checks auth requirement
 *   - Dispatches OPEN_SHEET action
 *   - Syncs URL params
 * 
 * closeSheet()
 *   - Dispatches CLOSE_SHEET action
 *   - Cleans URL params
 *   - Does NOT add history entry (replace)
 * 
 * pushSheet(type, props)
 *   - Stacks current sheet
 *   - Opens new sheet on top
 *   - For nested navigation (e.g., profile → chat)
 * 
 * popSheet()
 *   - Returns to previous sheet in stack
 *   - If stack empty, closes sheet
 * 
 * dismissAll()
 *   - Clears entire stack
 *   - Closes all sheets
 *   - Emergency reset
 */

export type SheetAction =
  | { type: 'OPEN_SHEET'; payload: { type: string; props: Record<string, unknown> } }
  | { type: 'CLOSE_SHEET' }
  | { type: 'PUSH_SHEET'; payload: { type: string; props: Record<string, unknown> } }
  | { type: 'POP_SHEET' }
  | { type: 'DISMISS_ALL' }
  | { type: 'ANIMATION_COMPLETE' }
  | { type: 'UPDATE_PROPS'; payload: Record<string, unknown> };

export interface SheetState {
  activeSheet: string | null;
  sheetProps: Record<string, unknown>;
  sheetStack: Array<{ type: string; props: Record<string, unknown> }>;
  isAnimating: boolean;
  direction: 'up' | 'down';
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function isValidSheetType(type: string): boolean {
  return type in SHEET_REGISTRY;
}

export function getSheetConfig(type: string): SheetDefinition | null {
  return SHEET_REGISTRY[type] ?? null;
}

export function getSheetHeight(type: string): string {
  const config = SHEET_REGISTRY[type];
  if (!config) return SHEET_HEIGHTS.medium;
  return SHEET_HEIGHTS[config.height];
}

export function requiresAuth(type: string): boolean {
  const config = SHEET_REGISTRY[type];
  return config?.auth ?? false;
}

export function getDeepLinkParams(type: string): string[] {
  const config = SHEET_REGISTRY[type];
  return config?.deepLinkParams ?? [];
}

/**
 * Build URL search params for a sheet
 */
export function buildSheetUrl(type: string, props: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  params.set('sheet', type);
  
  const deepLinkParams = getDeepLinkParams(type);
  for (const key of deepLinkParams) {
    if (props[key] != null) {
      params.set(key, String(props[key]));
    }
  }
  
  return params;
}

/**
 * Parse sheet state from URL search params
 */
export function parseSheetFromUrl(searchParams: URLSearchParams): { type: string; props: Record<string, unknown> } | null {
  const type = searchParams.get('sheet');
  if (!type || !isValidSheetType(type)) return null;
  
  const props: Record<string, unknown> = {};
  const deepLinkParams = getDeepLinkParams(type);
  
  for (const key of deepLinkParams) {
    const value = searchParams.get(key);
    if (value != null) {
      props[key] = value;
    }
  }
  
  return { type, props };
}
