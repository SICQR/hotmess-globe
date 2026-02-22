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

// ═══════════════════════════════════════════════════════════════════════════
// PLACEHOLDER FOR UNIMPLEMENTED SHEETS
// ═══════════════════════════════════════════════════════════════════════════

function PlaceholderSheet({ sheetType }) {
  const config = SHEET_REGISTRY[sheetType];
  return (
    <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
      <Construction className="w-12 h-12 text-[#FF1493] mb-4" />
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
      <Loader2 className="w-8 h-8 text-[#FF1493] animate-spin" />
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
