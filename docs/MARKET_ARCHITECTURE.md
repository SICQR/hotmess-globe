# Market Architecture — MESSMARKET
**Version:** 1.0  
**Date:** 2026-02-20  
**Status:** Stage 1 intelligence — defines the unified market contract (Contract F)

---

## Purpose

Define MESSMARKET as ONE unified market surface composed of two distinct commerce systems:

- **A) Shopify** — official brand catalogue + checkout (external authority for checkout only)
- **B) Preloved / P2P** — user-to-user listings on Supabase (tickets, items, creator products)

The two systems are composed into a single market OS surface. They share a grid, a product card component, and a detail flow. Checkout is the only point of divergence.

---

## 1. Current State Audit

### 1.1 Commerce systems

| System | Route | Data source | Cart | Checkout |
|--------|-------|-------------|------|----------|
| Shopify official store | `/market` (main entry) | Shopify Storefront API | `ShopCartContext` (Storefront API cart token) | `window.location.assign(checkoutUrl)` — external hard nav |
| P2P / Creator marketplace | `/market/creators` | Supabase `products`, `creator_products` | `cartStorage.js` (Supabase `cart_items`) | `/market/creators/checkout` — internal route |
| Ticket resale | `/TicketMarketplace` | Supabase `ticket_listings` | None (direct purchase) | Internal |
| Preloved (beacons-linked items) | Scattered in `Vault`, `Beacons`, `Marketplace.jsx` | Supabase `products` | `cartStorage.js` | Internal |

### 1.2 Page inventory

| Page | File | Purpose | Status |
|------|------|---------|--------|
| `Shop` | `src/pages/Shop.jsx` | Shopify product grid (main `/market`) | Active, canonical Shopify entry |
| `ShopCollection` | `src/pages/ShopCollection.jsx` | Shopify collection browse | Active |
| `ShopProduct` | `src/pages/ShopProduct.jsx` | Shopify PDP | Active |
| `ShopCart` | `src/pages/ShopCart.jsx` | Shopify cart page | Active |
| `CheckoutStart` | `src/pages/CheckoutStart.jsx` | Initiates Shopify checkout | Active |
| `Marketplace` | `src/pages/Marketplace.jsx` | P2P product grid + Shopify collections tab | Partially complete |
| `ProductDetail` | `src/pages/ProductDetail.jsx` | P2P product detail | Active |
| `OrderHistory` | `src/pages/OrderHistory.jsx` | Combined order history (Shopify + P2P) | Active |
| `CreatorsCart` | `src/pages/CreatorsCart.jsx` | P2P cart page | Active |
| `CreatorsCheckout` | `src/pages/CreatorsCheckout.jsx` | P2P checkout | Partial |
| `CreatorsCheckoutSuccess` | `src/pages/CreatorsCheckoutSuccess.jsx` | P2P checkout success | Active |
| `TicketMarketplace` | `src/pages/TicketMarketplace.jsx` | Ticket P2P | Active |
| `SellerDashboard` | `src/pages/SellerDashboard.jsx` | Seller inventory management | Active |

### 1.3 Cart systems (two parallel systems)

| System | Context/Store | Storage | Merge-on-login |
|--------|--------------|---------|---------------|
| Shopify | `ShopCartContext` (`src/features/shop/cart/`) | localStorage + Storefront API cart | Via `ShopCartContext` |
| P2P / Creators | `cartStorage.js` functions | Supabase `cart_items` (guest: `localStorage cartItems`) | `mergeGuestCartToUser()` |

### 1.4 Product card components

| Component | Purpose | Source-aware? |
|-----------|---------|--------------|
| `src/components/marketplace/ProductCard.jsx` | P2P/Supabase product card | ❌ P2P only |
| `src/pages/Shop.jsx` inline cards | Shopify product cards | ❌ Shopify only |
| `src/features/shop/cart/ShopCartDrawer.jsx` cart items | Shopify cart line items | ❌ Shopify only |
| `src/components/marketplace/CartDrawer.jsx` cart items | P2P cart items | ❌ P2P only |

---

## 2. Target Architecture — MESSMARKET

### 2.1 Unified data type

```ts
// src/features/market/types.ts (create in Stage 6)
export interface MarketItem {
  id: string
  source: 'shopify' | 'preloved' | 'ticket'
  title: string
  price: number          // pence/cents
  currency: string       // 'GBP'
  media: { url: string; alt?: string }[]
  seller?: {
    id: string
    name: string
    avatar?: string
  }
  // Source-specific opaque payload (handled by adapters)
  _shopifyHandle?: string
  _supabaseId?: string
  detailAction: () => void  // Opens the detail surface
}
```

### 2.2 Source adapters

```ts
// src/features/market/adapters/shopifyAdapter.ts
// Transforms Shopify Storefront API product → MarketItem
// detailAction: openSheet(SHEET_TYPES.SHOP, { handle }) OR navigate(`/market/p/${handle}`)

// src/features/market/adapters/prelovedAdapter.ts
// Transforms Supabase product row → MarketItem
// detailAction: openSheet(SHEET_TYPES.PRODUCT, { id }) OR navigate(`/ProductDetail?id=${id}`)

// src/features/market/adapters/ticketAdapter.ts
// Transforms ticket_listing → MarketItem
// detailAction: navigate(`/tickets/${id}`)
```

### 2.3 Unified grid component

```tsx
// src/features/market/MarketGrid.tsx (create in Stage 6)
// Props: items: MarketItem[], loading, onLoadMore
// Uses ONE product card component that renders any MarketItem regardless of source
```

### 2.4 Unified cart

`UnifiedCartDrawer` (`src/components/marketplace/UnifiedCartDrawer.jsx`) becomes the single cart drawer, mounted at root level (not inside any page). It reads from both `ShopCartContext` and `cartStorage.js`.

Checkout split:
- Shopify items → "Checkout with Shopify" → `window.location.assign(checkoutUrl)` (the ONLY permitted hard navigation inside Market)
- Preloved items → "Checkout" → `navigate('/market/creators/checkout')`

### 2.5 Route map (target)

```
/market                   → MESSMARKET grid (Shopify as default tab)
/market/:collection       → Shopify collection browse
/market/p/:handle         → Shopify PDP (sheet or page)
/market/preloved          → Preloved grid
/market/preloved/:id      → Preloved PDP (sheet or page)
/market/creators          → P2P creator marketplace
/market/creators/p/:id    → Creator PDP
/market/creators/cart     → P2P cart
/market/creators/checkout → P2P checkout
/market/tickets           → Ticket marketplace
/cart                     → Shopify cart
/checkout/start           → Shopify checkout initiation
/orders                   → Unified order history
/orders/:id               → Order detail (future)
```

---

## 3. Preloved System Requirements

### 3.1 Supabase tables used

| Table | Purpose |
|-------|---------|
| `products` | P2P listings (seller-uploaded) |
| `creator_products` | Creator economy products |
| `cart_items` | Guest + authenticated cart (Supabase-backed) |
| `product_orders` | Order records |
| `product_reviews` | Reviews |
| `product_saves` | Wishlists |
| `sellers` | Seller profiles |
| `creator_profiles` | Creator profiles |

### 3.2 Storage bucket

`uploads` bucket — RLS: owner can upload, public can read.

### 3.3 Listing lifecycle

| Action | Route | API | Auth required |
|--------|-------|-----|---------------|
| Browse listings | `/market` or `/market/preloved` | `GET /api/market/products` | ❌ |
| View listing detail | `/ProductDetail?id=` or sheet | `GET /api/market/products/:id` | ❌ |
| Create listing | `/SellerDashboard` | `POST /api/market/products` | ✅ |
| Edit listing | `/SellerDashboard` | `PATCH /api/market/products/:id` | ✅ (owner) |
| Delete listing | `/SellerDashboard` | `DELETE /api/market/products/:id` | ✅ (owner) |
| Upload images | Storage upload | Supabase Storage `uploads` bucket | ✅ |
| Add to cart | Any PDP | `cartStorage.addToCart()` | ❌ (guest ok) |
| Checkout | `/market/creators/checkout` | Stripe Connect (planned) | ✅ |

### 3.4 Current gaps in Preloved

| Gap | Impact | Stage |
|-----|--------|-------|
| No `/market/preloved` route exists | Users land on old `/Marketplace` PascalCase URL | Stage 6 |
| `CreatorsCheckout` only partially implemented | Checkout flow breaks | Stage 6 |
| Storage upload not integrated in `ProductForm.jsx` | Images can't be uploaded from the form | Stage 7 |
| Listing ownership not enforced in RLS | Security gap | Immediate (see `STABILIZATION_EXECUTION_PLAN.md §4.3`) |

---

## 4. Shopify Integration Boundaries

### What Shopify handles

- Product catalogue (via Storefront API)
- Cart creation and management (via Storefront API cart mutations)
- Checkout (via `checkoutUrl` — external redirect, the ONLY hard nav allowed in Market)
- Order history (via Admin API through `api/shopify/*` serverless functions)

### What Shopify does NOT handle

- User identity (Supabase owns this)
- Preloved / P2P listings
- Ticket resale
- Creator products
- Cart persistence for Preloved items

### Storefront API client

`src/features/shop/api/shopifyStorefront.js` — client-side only. Never call Shopify Storefront API from serverless functions with the storefront token; use the Admin API via `api/shopify/*` instead.

---

## 5. Definition of Done (Stage 6 Gate)

- [ ] `MarketItem` type defined in `src/features/market/types.ts`
- [ ] Shopify adapter and Preloved adapter implemented
- [ ] `MarketGrid` renders both sources with one `ProductCard` component
- [ ] `UnifiedCartDrawer` mounted at root; reads both cart systems
- [ ] Checkout fork: Shopify → hard nav; Preloved → internal route
- [ ] `/market/preloved` route serves Preloved grid
- [ ] Preloved create/edit/delete listing works end-to-end
- [ ] Shopify checkout completes successfully
- [ ] Back from PDP returns to grid deterministically
- [ ] No `CartDrawer.jsx` usage (replaced by `UnifiedCartDrawer`)
