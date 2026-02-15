/**
 * L2MarketplaceSheet — Sheet wrapper for Marketplace/Shop page
 * 
 * Wraps the Shop page in a sheet format with slide-up animation.
 * Shows Shopify products, P2P marketplace, and commerce features.
 */

import React from 'react';
import Shop from '@/pages/Shop';

export default function L2MarketplaceSheet(props) {
  return (
    <div className="h-full overflow-y-auto">
      <Shop {...props} />
    </div>
  );
}
