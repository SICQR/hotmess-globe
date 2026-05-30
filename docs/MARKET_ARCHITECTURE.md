# HOTMESS Market Architecture (MESSMARKET)

**Version:** 1.0  
**Date:** 2026-02-20  
**Purpose:** Define ONE Market OS surface composed of Shopify + Preloved

> **Note:** Line numbers and counts are derived from ripgrep at time of writing. Re-run verification commands before making changes.

---

## 1. Current State (Problem)

Market/commerce functionality is fragmented across multiple systems:

### Shopify (Headless Storefront API)
- `src/pages/Shop.jsx` — Shopify catalog entry
- `src/pages/ShopCart.jsx` — Shopify cart
- `src/pages/ShopProduct.jsx` — Shopify product detail
- `src/pages/ShopCollection.jsx` — Shopify collection view
- `src/components/marketplace/ShopCollections.jsx` — Collection grid
- `src/features/shop/cart/ShopCartContext.jsx` — Cart state (Shopify)
- `src/features/shop/cart/ShopCartDrawer.jsx` — Cart drawer UI

### Preloved/Creators (Supabase)
- `src/pages/Marketplace.jsx` — P2P/Creator listings
- `src/pages/ProductDetail.jsx` — Generic product detail
- `src/pages/CreatorsCart.jsx` — Creators cart
- `src/pages/CreatorsCheckout.jsx` — Stripe Connect checkout
- `src/pages/CreatorsCheckoutSuccess.jsx` — Success page

### Tickets
- `src/pages/TicketMarketplace.jsx` — Ticket resale

### Sheets
- `src/components/sheets/L2MarketplaceSheet.jsx` — Preloved sheet
- `src/components/sheets/L2ShopSheet.jsx` — Shopify sheet (candidate to merge)

---

## 2. Target Architecture

### MESSMARKET = Unified Market Surface

All commerce renders through one unified interface with source adapters:

```
┌─────────────────────────────────────────────────────────────┐
│                     MESSMARKET (UI Layer)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ ProductGrid │  │ProductDetail│  │   Cart      │          │
│  │ (unified)   │  │ (unified)   │  │ (unified)   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│  ┌──────┴────────────────┴────────────────┴──────┐          │
│  │              MarketItem Interface              │          │
│  └──────┬────────────────┬────────────────┬──────┘          │
├─────────┼────────────────┼────────────────┼──────────────────┤
│         │                │                │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐          │
│  │   Shopify   │  │  Preloved   │  │   Tickets   │          │
│  │   Adapter   │  │   Adapter   │  │   Adapter   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Shopify API     │  Supabase        │  Supabase             │
│  (Storefront)    │  (listings)      │  (ticket_listings)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Contract F: Market Interface

```typescript
// src/lib/market.ts

export type MarketSource = 'shopify' | 'preloved' | 'tickets';

export interface MarketItem {
  /** Unique ID within source */
  id: string;
  
  /** Source system */
  source: MarketSource;
  
  /** Display data */
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  
  /** Media */
  images: string[];
  thumbnail: string;
  
  /** Availability */
  available: boolean;
  quantity?: number;
  
  /** Seller (for preloved/tickets) */
  seller?: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  
  /** Category/tags */
  category?: string;
  tags?: string[];
  
  /** Routing */
  detailUrl: string;
  
  /** Raw source data */
  _raw: unknown;
}

export interface MarketFilters {
  source?: MarketSource | 'all';
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sellerId?: string;
  collection?: string;
}

export interface MarketCartItem {
  item: MarketItem;
  quantity: number;
  variantId?: string; // Shopify variants
}
```

---

## 4. Adapters

### Shopify Adapter
```typescript
// src/lib/market/shopifyAdapter.ts

import { shopifyClient } from '@/lib/shopify';
import type { MarketItem } from '../market';

export async function fetchShopifyProducts(filters: MarketFilters): Promise<MarketItem[]> {
  const products = await shopifyClient.product.fetchAll();
  
  return products.map(product => ({
    id: product.id,
    source: 'shopify',
    title: product.title,
    description: product.description,
    price: parseFloat(product.variants[0]?.price || '0'),
    compareAtPrice: product.variants[0]?.compareAtPrice 
      ? parseFloat(product.variants[0].compareAtPrice) 
      : undefined,
    currency: 'GBP',
    images: product.images.map(img => img.src),
    thumbnail: product.images[0]?.src || '',
    available: product.availableForSale,
    category: product.productType,
    tags: product.tags,
    detailUrl: `/market/p/${product.handle}`,
    _raw: product,
  }));
}

export async function createShopifyCheckout(items: MarketCartItem[]): Promise<string> {
  // Returns checkout URL — this is the ONLY allowed hard redirect
  const checkout = await shopifyClient.checkout.create();
  // ... add items
  return checkout.webUrl;
}
```

### Preloved Adapter
```typescript
// src/lib/market/prelovedAdapter.ts

import { supabase } from '@/components/utils/supabaseClient';
import type { MarketItem } from '../market';

export async function fetchPrelovedListings(filters: MarketFilters): Promise<MarketItem[]> {
  let query = supabase
    .from('marketplace_listings')
    .select(`
      *,
      seller:profiles!seller_id(id, display_name, avatar_url, verified)
    `)
    .eq('status', 'active');
  
  if (filters.minPrice) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.search) query = query.ilike('title', `%${filters.search}%`);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).map(listing => ({
    id: listing.id,
    source: 'preloved',
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: listing.currency || 'GBP',
    images: listing.images || [],
    thumbnail: listing.images?.[0] || '',
    available: listing.quantity > 0,
    quantity: listing.quantity,
    seller: listing.seller ? {
      id: listing.seller.id,
      name: listing.seller.display_name,
      avatar: listing.seller.avatar_url,
      verified: listing.seller.verified,
    } : undefined,
    category: listing.category,
    tags: listing.tags,
    detailUrl: `/market/creators/p/${listing.id}`,
    _raw: listing,
  }));
}
```

### Tickets Adapter
```typescript
// src/lib/market/ticketsAdapter.ts

import { supabase } from '@/components/utils/supabaseClient';
import type { MarketItem } from '../market';

export async function fetchTicketListings(filters: MarketFilters): Promise<MarketItem[]> {
  const { data, error } = await supabase
    .from('ticket_listings')
    .select(`
      *,
      event:events!event_id(id, title, start_time, venue),
      seller:profiles!seller_id(id, display_name, avatar_url)
    `)
    .eq('status', 'available');
  
  if (error) throw error;
  
  return (data || []).map(listing => ({
    id: listing.id,
    source: 'tickets',
    title: `${listing.event?.title} - ${listing.ticket_type}`,
    description: `${listing.event?.venue} • ${listing.event?.start_time}`,
    price: listing.price,
    currency: 'GBP',
    images: [listing.event?.cover_image].filter(Boolean),
    thumbnail: listing.event?.cover_image || '',
    available: true,
    quantity: listing.quantity,
    seller: listing.seller ? {
      id: listing.seller.id,
      name: listing.seller.display_name,
      avatar: listing.seller.avatar_url,
    } : undefined,
    category: 'tickets',
    detailUrl: `/market/tickets/${listing.id}`,
    _raw: listing,
  }));
}
```

---

## 5. Unified Hooks

```typescript
// src/hooks/useMarket.ts

import { useQuery } from '@tanstack/react-query';
import { fetchShopifyProducts } from '@/lib/market/shopifyAdapter';
import { fetchPrelovedListings } from '@/lib/market/prelovedAdapter';
import { fetchTicketListings } from '@/lib/market/ticketsAdapter';
import type { MarketItem, MarketFilters } from '@/lib/market';

export function useMarketItems(filters: MarketFilters = {}) {
  return useQuery({
    queryKey: ['market', filters],
    queryFn: async (): Promise<MarketItem[]> => {
      const source = filters.source || 'all';
      
      const fetchers = {
        shopify: fetchShopifyProducts,
        preloved: fetchPrelovedListings,
        tickets: fetchTicketListings,
      };
      
      if (source !== 'all') {
        return fetchers[source](filters);
      }
      
      // Fetch all sources in parallel
      const [shopify, preloved, tickets] = await Promise.all([
        fetchShopifyProducts(filters),
        fetchPrelovedListings(filters),
        fetchTicketListings(filters),
      ]);
      
      return [...shopify, ...preloved, ...tickets];
    },
    staleTime: 60_000, // 1 minute
  });
}
```

---

## 6. Unified Cart

```typescript
// src/contexts/UnifiedCartContext.tsx

import React, { createContext, useContext, useReducer } from 'react';
import type { MarketCartItem, MarketItem } from '@/lib/market';

interface CartState {
  items: MarketCartItem[];
  // Separate checkouts per source
  shopifyCheckoutId?: string;
  prelovedCheckoutId?: string;
}

type CartAction =
  | { type: 'ADD_ITEM'; item: MarketItem; quantity?: number; variantId?: string }
  | { type: 'REMOVE_ITEM'; itemId: string; source: string }
  | { type: 'UPDATE_QUANTITY'; itemId: string; source: string; quantity: number }
  | { type: 'CLEAR_SOURCE'; source: string }
  | { type: 'CLEAR_ALL' };

function cartReducer(state: CartState, action: CartAction): CartState {
  // ... implementation
}

export function UnifiedCartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  
  // Persist to localStorage
  // Merge guest cart on login
  // ...
  
  return (
    <UnifiedCartContext.Provider value={{ state, dispatch }}>
      {children}
    </UnifiedCartContext.Provider>
  );
}
```

---

## 7. Checkout Flows

### Shopify Checkout
```
User clicks "Checkout" on Shopify items
  → createShopifyCheckout(items)
  → Returns Shopify checkout URL
  → window.location.href = checkoutUrl (ONLY allowed hard redirect)
  → User completes on Shopify
  → Shopify redirects back to /market?checkout=success
```

### Preloved/Creators Checkout
```
User clicks "Checkout" on Preloved items
  → Navigate to /market/creators/checkout (internal)
  → Stripe Connect checkout flow
  → On success → /market/creators/checkout-success
```

### Mixed Cart
```
User has items from multiple sources
  → Show cart grouped by source
  → "Checkout Shopify items" button → Shopify flow
  → "Checkout Preloved items" button → Creators flow
  → Do NOT attempt to merge checkouts
```

---

## 8. Routes (Canonical)

```jsx
// Market entry
<Route path="/market" element={<MarketHome />} />

// Shopify
<Route path="/market/p/:handle" element={<ShopifyProductDetail />} />
<Route path="/market/:collection" element={<ShopifyCollection />} />

// Preloved/Creators
<Route path="/market/creators" element={<PrelovedGrid />} />
<Route path="/market/creators/p/:id" element={<PrelovedProductDetail />} />
<Route path="/market/creators/cart" element={<CreatorsCart />} />
<Route path="/market/creators/checkout" element={<CreatorsCheckout />} />
<Route path="/market/creators/checkout-success" element={<CreatorsCheckoutSuccess />} />

// Tickets
<Route path="/market/tickets" element={<TicketsGrid />} />
<Route path="/market/tickets/:id" element={<TicketDetail />} />

// Legacy redirects (keep)
<Route path="/shop" element={<Navigate to="/market" replace />} />
<Route path="/marketplace" element={<Navigate to="/market" replace />} />
```

---

## 9. Sheet Integration

```typescript
// Open market detail as sheet
const { openSheet } = useSheet();

// From any surface (globe, search, etc.)
openSheet(SHEET_TYPES.MARKETPLACE, {
  itemId: item.id,
  source: item.source,
});

// L2MarketplaceSheet handles routing internally:
// - If source === 'shopify' → render ShopifyProductDetail
// - If source === 'preloved' → render PrelovedProductDetail
// - If source === 'tickets' → render TicketDetail
```

---

## 10. Migration Checklist

### Phase 1: Create Contracts
- [x] Create `src/lib/market.ts` with MarketItem interface ✅ Stage 5
- [ ] Create `src/lib/market/shopifyAdapter.ts` (deferred)
- [ ] Create `src/lib/market/prelovedAdapter.ts` (deferred)
- [ ] Create `src/lib/market/ticketsAdapter.ts` (deferred)

### Phase 2: Create Hooks
- [ ] Create `src/hooks/useMarket.ts`
- [ ] Create unified cart context (or enhance ShopCartContext)

### Phase 3: Unify UI (DEFERRED)
- [ ] Create `MarketProductCard` component (renders any MarketItem)
- [ ] Create `MarketProductGrid` component
- [ ] Update `/market` route to use unified grid

### Phase 4: Consolidate Sheets (DEFERRED)
- [ ] Enhance L2MarketplaceSheet to handle all sources
- [ ] Candidate: merge L2ShopSheet (verify no unique features first)

### Phase 5: Verify
- [x] Existing Preloved flow functional ✅
- [x] Existing Shopify flow functional ✅
- [ ] Unified grid with adapters
- [ ] Filters work across sources
- [ ] Cart handles multiple sources
- [ ] Shopify checkout redirects correctly
- [ ] Creators checkout works end-to-end

---

## Verification Commands

```bash
# Find all market-related files
rg "Marketplace|Preloved|Shop|Shopify|MESSMARKET|CreatorsCart" -l src

# Find Shopify client usage
rg "shopifyClient|Storefront" -n src

# Find cart contexts
rg "CartContext|CartProvider|useCart" -n src

# Find checkout flows
rg "checkout|Checkout" -l src
```
