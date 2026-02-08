/**
 * L2VaultSheet — Unified purchases as a sheet overlay
 * 
 * Replaces: /vault page navigation
 * Shows: Shopify orders + P2P purchases
 */

import React from 'react';
import { Package } from 'lucide-react';
import { SheetSection } from './L2SheetContainer';

export default function L2VaultSheet() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <Package className="w-12 h-12 text-white/20 mb-4" />
      <p className="text-white/60 mb-2">Vault Sheet</p>
      <p className="text-white/40 text-sm">
        Your purchases will appear here...
      </p>
    </div>
  );
}
