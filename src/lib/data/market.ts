/**
 * Market Domain Layer
 * 
 * Unified commerce engine for Shopify + Preloved + Creator gear.
 * All product data normalized to single Product model.
 */

import { supabase } from '@/components/utils/supabaseClient';
import { BRAND_CONFIG } from '@/config/brands';

// Unified Product Model
export interface Product {
  id: string;
  source: 'shopify' | 'preloved' | 'creator';
  title: string;
  description?: string;
  price: number;
  currency: string;
  compareAtPrice?: number;
  images: string[];
  category?: string;
  tags?: string[];
  sellerId?: string;
  sellerName?: string;
  sellerAvatar?: string;
  condition?: 'new' | 'like_new' | 'good' | 'fair';
  available: boolean;
  quantity?: number;
  variants?: ProductVariant[];
  vendor?: string;
  options?: { name: string; values: string[] }[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  available: boolean;
  sku?: string;
  selectedOptions?: { name: string; value: string }[];
}

export interface ProductFilters {
  source?: Product['source'] | 'all';
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: Product['condition'];
  search?: string;
  sellerId?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// PRELOVED (Supabase)
// ============================================

interface PrelovedListing {
  id: string;
  title: string;
  description?: string;
  price: number;
  images?: string[];
  category?: string;
  condition?: string;
  seller_id: string;
  status: string;
  created_at: string;
  updated_at?: string;
  seller?: { display_name?: string; avatar_url?: string };
}

function normalizePrelovedProduct(listing: any): Product {
  // Convert price_pence to decimal pounds if needed
  const price = typeof listing.price_pence === 'number' 
    ? listing.price_pence / 100 
    : (listing.price || 0);

  // Priority: 1. cover_image_url, 2. images array, 3. null
  let images = (listing.images && listing.images.length > 0) ? [...listing.images] : [];
  if (listing.cover_image_url && !images.includes(listing.cover_image_url)) {
    images.unshift(listing.cover_image_url);
  }
  
  if (images.length === 0) {
    // If absolutely no image, return a generic placeholder that isn't a specific product like a shirt
    images = ['https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?auto=format&fit=crop&q=80&w=800']; // Search/Box placeholder
  }

  return {
    id: `preloved_${listing.id}`,
    source: 'preloved',
    title: listing.title,
    description: listing.description,
    price: price,
    currency: listing.currency || 'GBP',
    images: images,
    category: listing.category,
    condition: listing.condition as Product['condition'],
    sellerId: listing.seller_id,
    sellerName: listing.seller?.display_name,
    sellerAvatar: listing.seller?.avatar_url,
    available: listing.status === 'active' || listing.status === 'live',
    createdAt: listing.created_at,
    updatedAt: listing.updated_at,
  };
}

export async function getPrelovedProducts(filters: ProductFilters = {}): Promise<Product[]> {
  try {
    // Step 1: fetch listings
    let query = supabase
      .from('market_listings')
      .select('*')
      .neq('status', 'deleted');

    // Filter by 'active' or 'live' status
    query = query.or('status.eq.active,status.eq.live');

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.minPrice !== undefined) {
      // filters.minPrice comes in as pounds, convert to pence for query
      query = query.gte('price_pence', filters.minPrice * 100);
    }
    if (filters.maxPrice !== undefined) {
      query = query.lte('price_pence', filters.maxPrice * 100);
    }
    if (filters.condition) {
      query = query.eq('condition', filters.condition);
    }
    if (filters.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data: listings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[market] getPrelovedProducts error:', error.message);
      return [];
    }

    if (!listings?.length) return [];

    // Step 2: Fetch media and sellers in parallel
    const listingIds = listings.map(l => l.id);
    const sellerIds = [...new Set(listings.map(l => l.seller_id).filter(Boolean))];

    const [mediaResponse, sellersResponse] = await Promise.all([
      supabase.from('market_listing_media').select('listing_id, storage_path').in('listing_id', listingIds).order('sort', { ascending: true }),
      sellerIds.length 
        ? supabase.from('market_sellers').select('id, display_name, logo_url').in('id', sellerIds)
        : Promise.resolve({ data: [] })
    ]);

    const mediaMap: Record<string, string[]> = {};
    (mediaResponse.data || []).forEach(m => {
      if (!mediaMap[m.listing_id]) mediaMap[m.listing_id] = [];
      mediaMap[m.listing_id].push(m.storage_path);
    });

    const sellerMap = Object.fromEntries((sellersResponse.data || []).map(s => [s.id, s]));

    // Step 3: normalize and attach seller/media data
    return listings.map(l => {
      const listing = { 
        ...l, 
        images: mediaMap[l.id] || [],
        seller: sellerMap[l.seller_id] || null 
      };
      return normalizePrelovedProduct(listing);
    });
  } catch (error) {
    console.error('[market] getPrelovedProducts exception:', error);
    return [];
  }
}

export async function getPrelovedProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[market] getPrelovedProductById error:', error.message);
    return null;
  }

  return normalizePrelovedProduct(data);
}

// ============================================
// SHOPIFY (via Vercel Proxy)
// ============================================

interface ShopifyProduct {
  id: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  handle: string;
  priceRange?: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice?: { amount: string; currencyCode: string };
  };
  compareAtPriceRange?: {
    minVariantPrice: { amount: string };
  };
  featuredImage?: { url: string; altText?: string };
  images: any; // Can be { url }[] or { nodes: { url }[] }
  productType?: string;
  vendor?: string;
  tags?: string[];
  availableForSale?: boolean;
  variants?: any; // Can be flat array or { nodes: [...] }
  options?: { name: string; values: string[] }[];
}

function normalizeShopifyProduct(product: ShopifyProduct): Product {
  // Extract variants — API returns { nodes: [...] } but interface may also be flat array
  const variantNodes: any[] = Array.isArray(product.variants)
    ? product.variants
    : product.variants?.nodes || [];

  // Extract price from priceRange (if present) or first variant as fallback
  const firstVariant = variantNodes[0];
  const price = product.priceRange?.minVariantPrice?.amount
    ? parseFloat(product.priceRange.minVariantPrice.amount)
    : firstVariant?.price?.amount
      ? parseFloat(firstVariant.price.amount)
      : 0;

  const currency = product.priceRange?.minVariantPrice?.currencyCode
    || firstVariant?.price?.currencyCode
    || 'GBP';

  // Extract compare-at price
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice?.amount
    ? parseFloat(product.compareAtPriceRange.minVariantPrice.amount)
    : firstVariant?.compareAtPrice?.amount
      ? parseFloat(firstVariant.compareAtPrice.amount)
      : undefined;

  // Extract images — handle both featuredImage and the full images list
  const allImageUrls: string[] = [
    product.featuredImage?.url,
    ...(Array.isArray(product.images)
      ? product.images.map((img: any) => typeof img === 'string' ? img : img.url)
      : product.images?.nodes?.map((img: any) => img.url) || [])
  ].filter(Boolean) as string[];

  const imageList = Array.from(new Set(allImageUrls));

  // Determine availability — check product-level flag or any variant
  const available = product.availableForSale !== undefined
    ? product.availableForSale
    : variantNodes.some((v: any) => v.availableForSale);

  return {
    id: `shopify_${product.id}`,
    source: 'shopify',
    title: product.title,
    description: product.descriptionHtml || product.description,
    price,
    currency,
    compareAtPrice,
    images: imageList,
    category: product.productType,
    tags: product.tags,
    available,
    variants: variantNodes.map((v: any) => ({
      id: v.id,
      title: v.title,
      price: parseFloat(v.price?.amount || '0'),
      available: v.availableForSale,
      sku: v.sku,
      selectedOptions: v.selectedOptions,
    })),
    vendor: product.vendor,
    options: product.options,
    metadata: { handle: product.handle },
  };
}

export async function getShopifyProducts(filters: ProductFilters = {}): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (filters.limit) params.set('limit', filters.limit.toString());

    const response = await fetch(`/api/shopify/products?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.products || []).map(normalizeShopifyProduct);
  } catch (error) {
    console.error('[market] getShopifyProducts error:', error);
    return [];
  }
}

/**
 * Retrieves a Shopify product by its storefront handle and returns it as a normalized Product.
 *
 * @param handle - The Shopify product handle (URL/slug identifying the product)
 * @returns The normalized `Product` for the requested handle, or `null` if the product could not be fetched or normalized
 */
export async function getShopifyProductById(handle: string): Promise<Product | null> {
  try {
    const response = await fetch(`/api/shopify/products/${handle}`);
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    return normalizeShopifyProduct(data.product);
  } catch (error) {
    console.error('[market] getShopifyProductById error:', error);
    return null;
  }
}

// ============================================
// INTERNAL PRODUCTS (Supabase `products` table)
// ============================================

interface InternalProduct {
  id: string;
  name: string;
  description?: string;
  price_gbp: number;
  product_type?: string;
  category?: string;
  tags?: string[];
  status: string;
  inventory_count?: number;
  content_rating?: string;
  age_verified_only?: boolean;
  image_urls?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Normalize a Supabase `products` row into the unified `Product` model used by the marketplace.
 *
 * @param row - The internal product row from the `products` table to convert
 * @returns A `Product` whose `id` is prefixed with `internal_`, `source` is set to `shopify`, `currency` is `GBP`, `images` come from `image_urls` (or `[]`), and `metadata` contains internal identifiers and verification flags; `available` is `true` when `row.status === 'active'` and `(row.inventory_count ?? 1) > 0`, `false` otherwise.
 */
function normalizeInternalProduct(row: InternalProduct): Product {
  return {
    id: `internal_${row.id}`,
    source: 'shopify', // Display as "Shop" in the UI
    title: row.name,
    description: row.description,
    price: row.price_gbp,
    currency: 'GBP',
    images: row.image_urls || [],
    category: row.category,
    tags: row.tags,
    available: row.status === 'active' && (row.inventory_count ?? 1) > 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: {
      internalId: row.id,
      ageVerifiedOnly: row.age_verified_only,
      contentRating: row.content_rating,
    },
    variants: [{
      id: `mock_variant_${row.id}`,
      title: 'Default',
      price: row.price_gbp,
      available: true
    }]
  };
}

/**
 * Fetches active internal products from the Supabase `products` table and returns them in the unified `Product` shape.
 *
 * @param filters - Optional filters to apply: `category` for exact category match and `search` for a case-insensitive partial match against the product `name`.
 * @returns An array of normalized `Product` objects ordered by `createdAt` descending (most recent first).
 */
export async function getInternalProducts(filters: ProductFilters = {}): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*')
    .eq('status', 'active');

  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[market] getInternalProducts error:', error.message);
    return [];
  }

  return (data || []).map(normalizeInternalProduct);
}

// ============================================
// UNIFIED MARKET API
// ============================================

/**
 * Fetches products from the requested source(s) and returns them merged and ordered by creation date.
 *
 * When `filters.source` is `"preloved"`, only Preloved listings are returned. When `filters.source` is `"shopify"`, internal products are included alongside Shopify products (internal first). For other values or when omitted, products from all sources (internal, Preloved, Shopify) are combined.
 *
 * @param filters - Optional filter options; `filters.source` may be `"preloved" | "shopify" | "all"` to scope which origins are queried.
 * @returns An array of `Product` objects from the selected sources, sorted by `createdAt` in descending order (most recent first).
 */
export async function getAllProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const source = filters.source || 'all';

  if (source === 'preloved') {
    return getPrelovedProducts(filters);
  }
  if (source === 'shopify') {
    // Include internal products alongside Shopify products
    const [shopify, internal] = await Promise.all([
      getShopifyProducts(filters),
      getInternalProducts(filters),
    ]);
    return [...internal, ...shopify];
  }

  // Fetch from all sources in parallel
  const [preloved, shopify, internal] = await Promise.all([
    getPrelovedProducts(filters),
    getShopifyProducts(filters),
    getInternalProducts(filters),
  ]);

  // Merge and sort by creation date
  const all = [...internal, ...preloved, ...shopify];
  all.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return all;
}

/**
 * Get product by unified ID
 */
export async function getProductById(unifiedId: string): Promise<Product | null> {
  if (unifiedId.startsWith('preloved_')) {
    const id = unifiedId.replace('preloved_', '');
    return getPrelovedProductById(id);
  }
  if (unifiedId.startsWith('shopify_')) {
    const handle = unifiedId.replace('shopify_', '');
    return getShopifyProductById(handle);
  }
  return null;
}

/**
 * Get product categories
 */
export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('market_listings')
    .select('category')
    .eq('status', 'active')
    .not('category', 'is', null);

  if (error) {
    console.error('[market] getCategories error:', error.message);
    return [];
  }

  const categories = [...new Set((data || []).map(d => d.category).filter(Boolean))] as string[];
  return categories.sort();
}

// ============================================
// BRAND-FILTERED PRODUCTS
// ============================================

/**
 * Get products for a specific brand.
 * Fetches from Shopify (via collection handle) and preloved (via category tag),
 * then merges into a unified Product[] array.
 * Each brand's collection handle is isolated per BRAND CHANNEL RULES.
 */
export async function getProductsByBrand(brandKey: string): Promise<Product[]> {
  try {
    const brand = BRAND_CONFIG[brandKey];
    if (!brand) {
      console.warn(`[market] getProductsByBrand: unknown brand key "${brandKey}"`);
      return [];
    }

    const collectionHandle = brand.shopifyCollection;

    // Fetch from both sources in parallel
    const [shopifyProducts, prelovedProducts] = await Promise.all([
      // Shopify: fetch by collection handle (if brand has one)
      collectionHandle
        ? getShopifyProducts({ category: collectionHandle })
        : Promise.resolve([]),
      // Preloved: fetch listings tagged with this brand's category
      getPrelovedProducts({ category: brandKey }),
    ]);

    // Merge and sort by creation date (newest first)
    const all = [...shopifyProducts, ...prelovedProducts];
    all.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return all;
  } catch (error) {
    console.warn('[market] getProductsByBrand error:', error);
    return [];
  }
}

// ============================================
// PRELOVED SELLER OPERATIONS
// ============================================

export interface CreateListingInput {
  title: string;
  description?: string;
  price: number;
  category?: string;
  condition?: Product['condition'];
  images?: string[];
}

export async function createListing(input: CreateListingInput): Promise<Product | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('market_listings')
    .insert({
      seller_id: user.id,
      title: input.title,
      description: input.description,
      price: input.price,
      category: input.category,
      condition: input.condition,
      images: input.images || [],
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[market] createListing error:', error.message);
    return null;
  }

  return normalizePrelovedProduct(data);
}

export async function updateListing(
  listingId: string, 
  updates: Partial<CreateListingInput>
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('market_listings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .select('*')
    .single();

  if (error) {
    console.error('[market] updateListing error:', error.message);
    return null;
  }

  return normalizePrelovedProduct(data);
}

export async function deleteListing(listingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('market_listings')
    .update({ status: 'deleted' })
    .eq('id', listingId);

  if (error) {
    console.error('[market] deleteListing error:', error.message);
    return false;
  }

  return true;
}

export async function getMyListings(): Promise<Product[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return getPrelovedProducts({ sellerId: user.id });
}
