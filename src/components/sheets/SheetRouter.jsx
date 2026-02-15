/**
 * SheetRouter — Maps sheet types to components
 * 
 * Lazy-loads sheet content to keep bundle small.
 * Listens to SheetContext and renders the appropriate sheet.
 */

import React, { Suspense, lazy } from 'react';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import L2SheetContainer from './L2SheetContainer';
import { Loader2 } from 'lucide-react';

// Lazy load sheet contents
const L2EventSheet = lazy(() => import('./L2EventSheet'));
const L2ProfileSheet = lazy(() => import('./L2ProfileSheet'));
const L2ChatSheet = lazy(() => import('./L2ChatSheet'));
const L2VaultSheet = lazy(() => import('./L2VaultSheet'));
const L2ShopSheet = lazy(() => import('./L2ShopSheet'));
const L2GhostedSheet = lazy(() => import('./L2GhostedSheet'));
const L2SocialSheet = lazy(() => import('./L2SocialSheet'));
const L2EventsSheet = lazy(() => import('./L2EventsSheet'));
const L2MarketplaceSheet = lazy(() => import('./L2MarketplaceSheet'));

// Loading fallback
function SheetLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-[#FF1493] animate-spin" />
    </div>
  );
}

// Sheet config — maps type to component and metadata
const SHEET_CONFIG = {
  [SHEET_TYPES.EVENT]: {
    Component: L2EventSheet,
    title: 'Event',
    height: '90vh',
  },
  [SHEET_TYPES.PROFILE]: {
    Component: L2ProfileSheet,
    title: 'Profile',
    height: '85vh',
  },
  [SHEET_TYPES.CHAT]: {
    Component: L2ChatSheet,
    title: 'Messages',
    height: '90vh',
  },
  [SHEET_TYPES.VAULT]: {
    Component: L2VaultSheet,
    title: 'Vault',
    height: '85vh',
  },
  [SHEET_TYPES.SHOP]: {
    Component: L2ShopSheet,
    title: 'Shop',
    height: '90vh',
  },
  [SHEET_TYPES.GHOSTED]: {
    Component: L2GhostedSheet,
    title: 'Right Now',
    height: '85vh',
  },
  [SHEET_TYPES.PRODUCT]: {
    Component: L2ShopSheet, // Reuse shop sheet for products
    title: 'Product',
    height: '90vh',
  },
  [SHEET_TYPES.SOCIAL]: {
    Component: L2SocialSheet,
    title: 'Social',
    height: '90vh',
  },
  [SHEET_TYPES.EVENTS]: {
    Component: L2EventsSheet,
    title: 'Events',
    height: '90vh',
  },
  [SHEET_TYPES.MARKETPLACE]: {
    Component: L2MarketplaceSheet,
    title: 'Market',
    height: '90vh',
  },
};

export default function SheetRouter() {
  const { activeSheet, sheetProps, isOpen } = useSheet();

  if (!isOpen || !activeSheet) {
    return null;
  }

  const config = SHEET_CONFIG[activeSheet];
  
  if (!config) {
    console.warn(`Unknown sheet type: ${activeSheet}`);
    return null;
  }

  const { Component, title, height } = config;

  // Dynamic title based on props
  const dynamicTitle = sheetProps?.title || title;
  const subtitle = sheetProps?.subtitle;

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
