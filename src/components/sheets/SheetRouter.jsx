/**
 * SheetRouter — Maps sheet types to components
 * 
 * Lazy-loads sheet content to keep bundle small.
 * Listens to SheetContext and renders the appropriate sheet.
 * 
 * Uses SHEET_REGISTRY from /src/lib/sheetSystem.ts for configuration.
 */

import React, { Suspense, lazy } from 'react';
import { useSheet } from '@/contexts/SheetContext';
import { SHEET_REGISTRY, getSheetHeight } from '@/lib/sheetSystem';
import L2SheetContainer from './L2SheetContainer';
import { Loader2, Construction } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// LAZY-LOADED SHEET COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const L2EventSheet = lazy(() => import('./L2EventSheet'));
const L2ProfileSheet = lazy(() => import('./L2ProfileSheet'));
const L2ChatSheet = lazy(() => import('./L2ChatSheet'));
const L2VaultSheet = lazy(() => import('./L2VaultSheet'));
const L2ShopSheet = lazy(() => import('./L2ShopSheet'));
const L2GhostedSheet = lazy(() => import('./L2GhostedSheet'));
const L2SocialSheet = lazy(() => import('./L2SocialSheet'));
const L2EventsSheet = lazy(() => import('./L2EventsSheet'));
const L2MarketplaceSheet = lazy(() => import('./L2MarketplaceSheet'));
const L2SellSheet = lazy(() => import('./L2SellSheet'));
const L2PayoutsSheet = lazy(() => import('./L2PayoutsSheet'));
const L2MyOrdersSheet = lazy(() => import('./L2MyOrdersSheet'));
const L2EditProfileSheet = lazy(() => import('./L2EditProfileSheet'));
const L2SearchSheet = lazy(() => import('./L2SearchSheet'));
const L2DirectionsSheet = lazy(() => import('./L2DirectionsSheet'));
const L2FiltersSheet = lazy(() => import('./L2FiltersSheet'));
const L2CartSheet = lazy(() => import('./L2CartSheet'));
const L2CheckoutSheet = lazy(() => import('./L2CheckoutSheet'));
const L2SafetySheet = lazy(() => import('./L2SafetySheet'));
const L2PrivacySheet = lazy(() => import('./L2PrivacySheet'));
const L2BlockedSheet = lazy(() => import('./L2BlockedSheet'));
const L2NotificationsSheet = lazy(() => import('./L2NotificationsSheet'));
const L2SettingsSheet = lazy(() => import('./L2SettingsSheet'));
const L2PhotosSheet = lazy(() => import('./L2PhotosSheet'));
const L2LocationSheet = lazy(() => import('./L2LocationSheet'));
const L2HelpSheet = lazy(() => import('./L2HelpSheet'));
const L2MembershipSheet = lazy(() => import('./L2MembershipSheet'));
const L2QRSheet = lazy(() => import('./L2QRSheet'));
const L2CreateEventSheet = lazy(() => import('./L2CreateEventSheet'));
const L2FavoritesSheet = lazy(() => import('./L2FavoritesSheet'));
const L2BeaconSheet = lazy(() => import('./L2BeaconSheet'));
const L2ScheduleSheet = lazy(() => import('./L2ScheduleSheet'));
const L2OrderSheet = lazy(() => import('./L2OrderSheet'));
const L2EmergencyContactSheet = lazy(() => import('./L2EmergencyContactSheet'));
const L2VideoCallSheet = lazy(() => import('./L2VideoCallSheet'));
const L2AdminSheet = lazy(() => import('./L2AdminSheet'));
const L2AmplifySheet = lazy(() => import('./L2AmplifySheet'));
const L2BrandSheet = lazy(() => import('./L2BrandSheet'));
const L2TicketSheet = lazy(() => import('./L2TicketSheet'));
const L2CommunityPostSheet = lazy(() => import('./L2CommunityPostSheet'));
const L2AchievementsSheet = lazy(() => import('./L2AchievementsSheet'));
const L2SquadsSheet = lazy(() => import('./L2SquadsSheet'));
const L2SweatCoinsSheet = lazy(() => import('./L2SweatCoinsSheet'));
const L2CreatorSubscriptionSheet = lazy(() => import('./L2CreatorSubscriptionSheet'));

// ═══════════════════════════════════════════════════════════════════════════
// PLACEHOLDER FOR UNIMPLEMENTED SHEETS
// ═══════════════════════════════════════════════════════════════════════════

function PlaceholderSheet({ sheetType }) {
  const config = SHEET_REGISTRY[sheetType];
  return (
    <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
      <Construction className="w-12 h-12 text-[#C8962C] mb-4" />
      <h3 className="text-lg font-bold text-white mb-2">{config?.title || 'Coming Soon'}</h3>
      <p className="text-sm text-white/60 mb-4">This feature is under construction.</p>
      <code className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded">sheet={sheetType}</code>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════════════════

function SheetLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHEET COMPONENT MAPPING
// Maps sheet type IDs to their React components
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_COMPONENTS = {
  // Core implemented sheets
  'profile': L2ProfileSheet,
  'event': L2EventSheet,
  'chat': L2ChatSheet,
  'vault': L2VaultSheet,
  'shop': L2ShopSheet,
  'ghosted': L2GhostedSheet,
  'social': L2SocialSheet,
  'events': L2EventsSheet,
  'marketplace': L2MarketplaceSheet,
  'product': L2ShopSheet, // Reuses shop sheet
  // Seller flows
  'sell': L2SellSheet,
  'seller-onboarding': L2SellSheet,
  'payouts': L2PayoutsSheet,
  'my-orders': L2MyOrdersSheet,
  'my-listings': L2MyOrdersSheet,
  // Profile management
  'edit-profile': L2EditProfileSheet,
  'photos': L2PhotosSheet,
  'location': L2LocationSheet,
  'privacy': L2PrivacySheet,
  'blocked': L2BlockedSheet,
  'notifications': L2NotificationsSheet,
  'settings': L2SettingsSheet,
  'membership': L2MembershipSheet,
  'help': L2HelpSheet,
  'safety': L2SafetySheet,
  // Search / discovery
  'search': L2SearchSheet,
  'directions': L2DirectionsSheet,
  // Cart & checkout
  'cart': L2CartSheet,
  'checkout': L2CheckoutSheet,
  'filters': L2FiltersSheet,
  // QR & events
  'qr': L2QRSheet,
  'create-event': L2CreateEventSheet,
  'favorites': L2FavoritesSheet,
  'beacon': L2BeaconSheet,
  'schedule': L2ScheduleSheet,
  'show': L2ScheduleSheet,
  'order': L2OrderSheet,
  'emergency-contact': L2EmergencyContactSheet,
  // Video call
  'video-call': L2VideoCallSheet,
  // Admin — City Ops
  'admin': L2AdminSheet,
  // B2B — City Amplification
  'amplify': L2AmplifySheet,
  // Brand landing pages — RAW / HUNG / HIGH / HUNGMESS
  'brand': L2BrandSheet,
  // Ticket resale market
  'ticket-market': L2TicketSheet,
  // Community features (DB live, UI added)
  'community': L2CommunityPostSheet,
  'achievements': L2AchievementsSheet,
  'squads': L2SquadsSheet,
  'sweat-coins': L2SweatCoinsSheet,
  'creator-subscription': L2CreatorSubscriptionSheet,
};

// ═══════════════════════════════════════════════════════════════════════════
// SHEET ROUTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function SheetRouter() {
  const { activeSheet, sheetProps, isOpen } = useSheet();

  if (!isOpen || !activeSheet) {
    return null;
  }

  // Get sheet configuration from registry
  const config = SHEET_REGISTRY[activeSheet];
  
  if (!config) {
    console.warn(`[SheetRouter] Unknown sheet type: ${activeSheet}`);
    return null;
  }

  // Get component (or placeholder if not implemented)
  const Component = SHEET_COMPONENTS[activeSheet] || 
    (() => <PlaceholderSheet sheetType={activeSheet} />);

  // Dynamic title based on props
  const dynamicTitle = sheetProps?.title || config.title;
  const subtitle = sheetProps?.subtitle;
  const height = getSheetHeight(activeSheet);

  return (
    <L2SheetContainer 
      title={dynamicTitle} 
      subtitle={subtitle}
      height={height}
    >
      <Suspense fallback={<SheetLoading />}>
        <Component {...sheetProps} />
      </Suspense>
    </L2SheetContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHEET LINK HELPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SheetLink — Helper component to open sheets from anywhere
 * 
 * Usage:
 * <SheetLink type="event" id="abc123">View Event</SheetLink>
 * <SheetLink type="profile" email="user@example.com">View Profile</SheetLink>
 */
export function SheetLink({ 
  type, 
  children, 
  className,
  ...props // id, email, thread, handle, etc.
}) {
  const { openSheet } = useSheet();

  const handleClick = (e) => {
    e.preventDefault();
    openSheet(type, props);
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
