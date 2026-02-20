/**
 * HOTMESS OS Mode System
 * 
 * The app has exactly 5 immersive modes:
 * 1. Ghosted (default) - Proximity grid + messaging
 * 2. Pulse - Globe + events + safety + live
 * 3. Market - Unified commerce (Shopify + Preloved)
 * 4. Radio - Persistent audio + live shows
 * 5. Profile - User settings + safety + listings
 */

export type OSMode = 'ghosted' | 'pulse' | 'market' | 'radio' | 'profile';

export interface ModeConfig {
  id: OSMode;
  path: string;
  label: string;
  icon: string;
  description: string;
}

export const MODES: Record<OSMode, ModeConfig> = {
  ghosted: {
    id: 'ghosted',
    path: '/',
    label: 'Ghosted',
    icon: 'grid',
    description: 'Proximity grid + messaging',
  },
  pulse: {
    id: 'pulse',
    path: '/pulse',
    label: 'Pulse',
    icon: 'globe',
    description: 'Globe + events + safety',
  },
  market: {
    id: 'market',
    path: '/market',
    label: 'Market',
    icon: 'shopping-bag',
    description: 'Shop + Preloved + Creator gear',
  },
  radio: {
    id: 'radio',
    path: '/radio',
    label: 'Radio',
    icon: 'radio',
    description: 'Live shows + music',
  },
  profile: {
    id: 'profile',
    path: '/profile',
    label: 'Profile',
    icon: 'user',
    description: 'Settings + safety + listings',
  },
};

export const MODE_ORDER: OSMode[] = ['ghosted', 'pulse', 'market', 'radio', 'profile'];

export function getModeFromPath(pathname: string): OSMode {
  // Check exact matches first
  if (pathname === '/' || pathname === '/ghosted') return 'ghosted';
  if (pathname.startsWith('/pulse') || pathname.startsWith('/globe') || pathname.startsWith('/events')) return 'pulse';
  if (pathname.startsWith('/market') || pathname.startsWith('/shop') || pathname.startsWith('/preloved')) return 'market';
  if (pathname.startsWith('/radio') || pathname.startsWith('/music')) return 'radio';
  if (pathname.startsWith('/profile') || pathname.startsWith('/settings') || pathname.startsWith('/account')) return 'profile';
  
  // Default to ghosted for unknown paths
  return 'ghosted';
}
