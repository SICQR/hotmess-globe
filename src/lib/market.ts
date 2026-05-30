/**
 * Market Authority Contract (Stage 5)
 * 
 * Unified interface for all market sources (Shopify, Preloved, Tickets).
 * 
 * @see docs/MARKET_ARCHITECTURE.md
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MarketSource = 'shopify' | 'preloved' | 'tickets';

export interface MarketSeller {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  verified?: boolean;
}

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
  seller?: MarketSeller;
  
  /** Category/tags */
  category?: string;
  tags?: string[];
  
  /** Routing */
  detailUrl: string;
  
  /** Shopify-specific */
  handle?: string;
  variants?: MarketVariant[];
  
  /** Raw source data (for debugging) */
  _raw?: unknown;
}

export interface MarketVariant {
  id: string;
  title: string;
  price: number;
  available: boolean;
  sku?: string;
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
  variantId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTERS (will transform source data to MarketItem)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transform a Supabase preloved product to MarketItem
 */
export function fromPrelovedProduct(product: Record<string, unknown>): MarketItem {
  const id = String(product.id || '');
  const images = Array.isArray(product.image_urls) 
    ? product.image_urls.map(String).filter(Boolean) 
    : [];
    
  return {
    id,
    source: 'preloved',
    title: String(product.title || product.name || 'Untitled'),
    description: String(product.description || ''),
    price: Number(product.price || 0),
    compareAtPrice: product.compare_at_price ? Number(product.compare_at_price) : undefined,
    currency: String(product.currency || 'GBP'),
    images,
    thumbnail: images[0] || '',
    available: product.status !== 'sold' && product.status !== 'draft',
    quantity: Number(product.quantity || 1),
    seller: product.created_by_email ? {
      id: String(product.created_by || ''),
      name: String(product.seller_name || 'Seller'),
      email: String(product.created_by_email || ''),
      verified: Boolean(product.seller_verified),
    } : undefined,
    category: String(product.category || ''),
    tags: Array.isArray(product.tags) ? product.tags.map(String) : [],
    detailUrl: `/market/preloved/${id}`,
    _raw: product,
  };
}

/**
 * Transform a Shopify product to MarketItem
 */
export function fromShopifyProduct(product: Record<string, unknown>): MarketItem {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = variants[0] as Record<string, unknown> | undefined;
  const images = Array.isArray(product.images) 
    ? (product.images as Array<Record<string, unknown>>).map(img => String(img?.src || ''))
    : [];
    
  return {
    id: String(product.id || ''),
    source: 'shopify',
    title: String(product.title || 'Untitled'),
    description: String(product.description || product.descriptionHtml || ''),
    price: parseFloat(String(firstVariant?.price || '0')),
    compareAtPrice: firstVariant?.compareAtPrice 
      ? parseFloat(String(firstVariant.compareAtPrice)) 
      : undefined,
    currency: 'GBP',
    images,
    thumbnail: images[0] || '',
    available: Boolean(product.availableForSale),
    handle: String(product.handle || ''),
    variants: variants.map((v: Record<string, unknown>) => ({
      id: String(v.id || ''),
      title: String(v.title || ''),
      price: parseFloat(String(v.price || '0')),
      available: Boolean(v.available ?? v.availableForSale),
      sku: v.sku ? String(v.sku) : undefined,
    })),
    category: String(product.productType || ''),
    tags: Array.isArray(product.tags) ? product.tags.map(String) : [],
    detailUrl: `/market/shop/${String(product.handle || product.id)}`,
    _raw: product,
  };
}

/**
 * Transform a ticket listing to MarketItem
 */
export function fromTicketListing(listing: Record<string, unknown>): MarketItem {
  const id = String(listing.id || '');
  const images = listing.image_url ? [String(listing.image_url)] : [];
  
  return {
    id,
    source: 'tickets',
    title: String(listing.event_name || listing.title || 'Ticket'),
    description: String(listing.description || ''),
    price: Number(listing.price || 0),
    currency: String(listing.currency || 'GBP'),
    images,
    thumbnail: images[0] || '',
    available: String(listing.status || '').toLowerCase() === 'available',
    quantity: Number(listing.quantity || 1),
    seller: listing.seller_email ? {
      id: String(listing.seller_id || ''),
      name: String(listing.seller_name || 'Seller'),
      email: String(listing.seller_email || ''),
    } : undefined,
    category: 'tickets',
    detailUrl: `/market/tickets/${id}`,
    _raw: listing,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKOUT RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shopify checkout is the ONLY allowed hard redirect.
 * This function returns true if a hard redirect is allowed for checkout.
 */
export function isAllowedCheckoutRedirect(url: string): boolean {
  // Only Shopify checkout URLs are allowed to hard redirect
  return url.includes('.myshopify.com/') || 
         url.includes('checkout.shopify.com');
}

/**
 * Get checkout URL for cart items.
 * - Shopify items: redirect to Shopify checkout
 * - Preloved items: use in-app Stripe checkout
 * - Mixed carts: not supported (split required)
 */
export function getCheckoutStrategy(items: MarketCartItem[]): {
  type: 'shopify' | 'stripe' | 'split';
  shopifyItems: MarketCartItem[];
  stripeItems: MarketCartItem[];
} {
  const shopifyItems = items.filter(i => i.item.source === 'shopify');
  const stripeItems = items.filter(i => i.item.source === 'preloved' || i.item.source === 'tickets');
  
  if (shopifyItems.length > 0 && stripeItems.length > 0) {
    return { type: 'split', shopifyItems, stripeItems };
  }
  
  if (shopifyItems.length > 0) {
    return { type: 'shopify', shopifyItems, stripeItems: [] };
  }
  
  return { type: 'stripe', shopifyItems: [], stripeItems };
}

export default {
  fromPrelovedProduct,
  fromShopifyProduct,
  fromTicketListing,
  isAllowedCheckoutRedirect,
  getCheckoutStrategy,
};
