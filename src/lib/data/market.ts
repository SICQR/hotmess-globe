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
  condition?: 'new' | 'like_new' | 'good' | 'fair';
  available: boolean;
  quantity?: number;
  variants?: ProductVariant[];
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
  seller?: { display_name?: string };
}

function normalizePrelovedProduct(listing: PrelovedListing): Product {
  return {
    id: `preloved_${listing.id}`,
    source: 'preloved',
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: 'GBP',
    images: listing.images || [],
    category: listing.category,
    condition: listing.condition as Product['condition'],
    sellerId: listing.seller_id,
    sellerName: listing.seller?.display_name,
    available: listing.status === 'active',
    createdAt: listing.created_at,
    updatedAt: listing.updated_at,
  };
}

export async function getPrelovedProducts(filters: ProductFilters = {}): Promise<Product[]> {
  let query = supabase
    .from('preloved_listings')
    .select('*')
    .eq('status', 'active');

  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);
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

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[market] getPrelovedProducts error:', error.message);
    return [];
  }

  return (data || []).map(normalizePrelovedProduct);
}

export async function getPrelovedProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('preloved_listings')
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
  handle: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  compareAtPriceRange?: {
    minVariantPrice: { amount: string };
  };
  images: { url: string }[];
  productType?: string;
  tags?: string[];
  availableForSale: boolean;
  variants?: {
    id: string;
    title: string;
    price: { amount: string };
    availableForSale: boolean;
    sku?: string;
  }[];
}

function normalizeShopifyProduct(product: ShopifyProduct): Product {
  return {
    id: `shopify_${product.id}`,
    source: 'shopify',
    title: product.title,
    description: product.description,
    price: parseFloat(product.priceRange?.minVariantPrice?.amount || '0'),
    currency: product.priceRange?.minVariantPrice?.currencyCode || 'GBP',
    compareAtPrice: product.compareAtPriceRange?.minVariantPrice
      ? parseFloat(product.compareAtPriceRange.minVariantPrice.amount)
      : undefined,
    images: Array.isArray(product.images)
      ? product.images.map(img => typeof img === 'string' ? img : img.url)
      : (product.images as any)?.nodes?.map((img: any) => img.url) || [],
    category: product.productType,
    tags: product.tags,
    available: product.availableForSale,
    variants: product.variants?.map(v => ({
      id: v.id,
      title: v.title,
      price: parseFloat(v.price.amount),
      available: v.availableForSale,
      sku: v.sku,
    })),
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
// UNIFIED MARKET API
// ============================================

/**
 * Get all products from all sources
 */
export async function getAllProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const source = filters.source || 'all';

  if (source === 'preloved') {
    return getPrelovedProducts(filters);
  }
  if (source === 'shopify') {
    return getShopifyProducts(filters);
  }

  // Fetch from all sources in parallel
  const [preloved, shopify] = await Promise.all([
    getPrelovedProducts(filters),
    getShopifyProducts(filters),
  ]);

  // Merge and sort by creation date
  const all = [...preloved, ...shopify];
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
    .from('preloved_listings')
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
    .from('preloved_listings')
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
    .from('preloved_listings')
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
    .from('preloved_listings')
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
