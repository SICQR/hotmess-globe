/**
 * MessMarket Commerce Hooks
 * 
 * Peer-to-peer commerce for MSM community.
 * Items are not people. This boundary is enforced.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// Allowed categories (matches enum)
export const PRODUCT_CATEGORIES = [
  { value: 'clothing', label: 'Clothing' },
  { value: 'fetish_gear', label: 'Fetish Gear' },
  { value: 'worn_items', label: 'Worn Items', requiresType: true },
  { value: 'physical_goods', label: 'Physical Goods' },
  { value: 'digital_goods', label: 'Digital Goods', isDigital: true },
  { value: 'telegram_access', label: 'Telegram Access', isDigital: true },
  { value: 'event_access', label: 'Event Access' },
  { value: 'custom', label: 'Other' },
];

export const WORN_ITEM_TYPES = [
  { value: 'underwear', label: 'Underwear' },
  { value: 'socks', label: 'Socks' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'sportswear', label: 'Sportswear' },
  { value: 'sleepwear', label: 'Sleepwear' },
  { value: 'other', label: 'Other' },
];

export const PRODUCT_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'worn', label: 'Worn' },
  { value: 'heavily_worn', label: 'Heavily Worn' },
];

// ============================================================================
// SELLER PROFILE
// ============================================================================

export function useSellerProfile() {
  const [seller, setSeller] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setIsLoading(false);
          return;
        }

        const { data, error: err } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (err && err.code !== 'PGRST116') throw err;
        if (!cancelled) setSeller(data || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { seller, isLoading, error };
}

export function useCreateSeller() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const createSeller = useCallback(async ({ displayName, bio, telegramHandle }) => {
    setIsPending(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const { data, error: err } = await supabase
        .from('sellers')
        .insert({
          user_id: user.id,
          display_name: displayName,
          bio,
          telegram_handle: telegramHandle,
          verification_level: 'email_verified', // Assume email verified via auth
        })
        .select()
        .single();

      if (err) throw err;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createSeller, isPending, error };
}

// ============================================================================
// PRODUCTS
// ============================================================================

export function useProducts(filters = {}) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        let query = supabase
          .from('products')
          .select(`
            *,
            seller:sellers(id, display_name, avatar_url, avg_rating, verification_level)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.wornItemType) {
          query = query.eq('worn_item_type', filters.wornItemType);
        }
        if (filters.minPrice) {
          query = query.gte('price', filters.minPrice);
        }
        if (filters.maxPrice) {
          query = query.lte('price', filters.maxPrice);
        }
        if (filters.sellerId) {
          query = query.eq('seller_id', filters.sellerId);
        }
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        if (filters.tags && filters.tags.length > 0) {
          query = query.contains('tags', filters.tags);
        }

        const limit = filters.limit || 24;
        query = query.limit(limit);

        const { data, error: err } = await query;
        if (err) throw err;
        if (!cancelled) setProducts(data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [
    filters.category,
    filters.wornItemType,
    filters.minPrice,
    filters.maxPrice,
    filters.sellerId,
    filters.search,
    filters.tags?.join(','),
    filters.limit,
  ]);

  return { products, isLoading, error };
}

export function useProduct(productId) {
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      try {
        const { data, error: err } = await supabase
          .from('products')
          .select(`
            *,
            seller:sellers(*)
          `)
          .eq('id', productId)
          .single();

        if (err) throw err;
        if (!cancelled) {
          setProduct(data);
          // Increment view count
          supabase.rpc('increment_product_views', { p_id: productId }).catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [productId]);

  return { product, isLoading, error };
}

export function useMyProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setIsLoading(false);
        return;
      }

      // Get seller ID first
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!seller || cancelled) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setProducts(data || []);
        setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { products, isLoading };
}

// ============================================================================
// CREATE/UPDATE PRODUCT
// ============================================================================

export function useCreateProduct() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const createProduct = useCallback(async (productData) => {
    setIsPending(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      // Get seller ID
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!seller) throw new Error('Must be a seller to list products');

      // Validate worn_items has type
      if (productData.category === 'worn_items' && !productData.worn_item_type) {
        throw new Error('Worn items must specify a type');
      }

      // Set digital flag
      const isDigital = ['digital_goods', 'telegram_access'].includes(productData.category);

      const { data, error: err } = await supabase
        .from('products')
        .insert({
          seller_id: seller.id,
          title: productData.title,
          description: productData.description,
          category: productData.category,
          worn_item_type: productData.worn_item_type,
          condition: productData.condition || 'good',
          price: productData.price,
          currency: productData.currency || 'GBP',
          quantity: productData.quantity || 1,
          images: productData.images || [],
          ships_from: productData.ships_from,
          shipping_cost: productData.shipping_cost || 0,
          is_digital: isDigital,
          telegram_room_link: productData.telegram_room_link,
          worn_duration: productData.worn_duration,
          worn_description: productData.worn_description,
          includes_proof_photo: productData.includes_proof_photo,
          tags: productData.tags || [],
          status: productData.status || 'draft',
        })
        .select()
        .single();

      if (err) throw err;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  const publishProduct = useCallback(async (productId) => {
    setIsPending(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('products')
        .update({
          status: 'active',
          published_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (err) throw err;
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createProduct, publishProduct, isPending, error };
}

// ============================================================================
// ORDERS
// ============================================================================

export function usePurchaseProduct() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const purchase = useCallback(async ({ productId, shippingAddress }) => {
    setIsPending(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      // Get product
      const { data: product, error: pErr } = await supabase
        .from('products')
        .select('*, seller:sellers(*)')
        .eq('id', productId)
        .eq('status', 'active')
        .single();

      if (pErr || !product) throw new Error('Product not available');

      // Can't buy own product
      if (product.seller.user_id === user.id) {
        throw new Error('Cannot purchase your own product');
      }

      // Calculate fees (10%)
      const platformFee = Math.round(product.price * 0.10 * 100) / 100;
      const sellerPayout = product.price - platformFee;

      // Create order
      const { data: order, error: oErr } = await supabase
        .from('product_orders')
        .insert({
          product_id: productId,
          seller_id: product.seller_id,
          buyer_id: user.id,
          price: product.price,
          shipping_cost: product.shipping_cost || 0,
          platform_fee: platformFee,
          seller_payout: sellerPayout,
          shipping_address: shippingAddress,
          status: 'pending',
        })
        .select()
        .single();

      if (oErr) throw oErr;

      // In production: create Stripe payment intent here
      // For now, return order for manual flow

      return order;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { purchase, isPending, error };
}

export function useMyOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('product_orders')
        .select(`
          *,
          product:products(id, title, images, category),
          seller:sellers(id, display_name, avatar_url)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setOrders(data || []);
        setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { orders, isLoading };
}

export function useMySales() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setIsLoading(false);
        return;
      }

      // Get seller ID
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!seller || cancelled) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('product_orders')
        .select(`
          *,
          product:products(id, title, images, category),
          buyer:auth.users(id, email)
        `)
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setOrders(data || []);
        setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { orders, isLoading };
}

// ============================================================================
// SAVES (Wishlist)
// ============================================================================

export function useSavedProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('product_saves')
        .select(`
          *,
          product:products(*, seller:sellers(id, display_name, avatar_url))
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setProducts(data?.map((s) => s.product).filter(Boolean) || []);
        setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { products, isLoading };
}

export function useSaveProduct() {
  const [isPending, setIsPending] = useState(false);

  const save = useCallback(async (productId) => {
    setIsPending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      await supabase
        .from('product_saves')
        .insert({ user_id: user.id, product_id: productId });

      // Increment save count
      supabase.rpc('increment_product_saves', { p_id: productId }).catch(() => {});

      return true;
    } finally {
      setIsPending(false);
    }
  }, []);

  const unsave = useCallback(async (productId) => {
    setIsPending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      await supabase
        .from('product_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      return true;
    } finally {
      setIsPending(false);
    }
  }, []);

  const checkSaved = useCallback(async (productId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { count } = await supabase
      .from('product_saves')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('product_id', productId);

    return count > 0;
  }, []);

  return { save, unsave, checkSaved, isPending };
}
