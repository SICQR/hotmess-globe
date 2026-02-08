/**
 * L2ShopSheet — Shopify store as a sheet overlay
 * 
 * Replaces: /market page navigation
 * TODO: Extract from Shop.jsx + ShopProduct.jsx
 */

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { SheetSection } from './L2SheetContainer';

export default function L2ShopSheet({ handle, product }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <ShoppingBag className="w-12 h-12 text-white/20 mb-4" />
      <p className="text-white/60 mb-2">Shop Sheet</p>
      <p className="text-white/40 text-sm">
        {handle || product ? `Product: ${handle || product}` : 'Store coming soon...'}
      </p>
    </div>
  );
}
