import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../utils';
import { ShoppingBag, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductCard from '../components/marketplace/ProductCard';
import AIRecommendations from '../components/marketplace/AIRecommendations';
import ShopCollections from '../components/marketplace/ShopCollections';
import EmptyState from '../components/ui/EmptyState';
import { GridSkeleton } from '../components/ui/LoadingSkeleton';
import TutorialTooltip from '../components/tutorial/TutorialTooltip';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { addToCart } from '@/components/marketplace/cartStorage';
import ProfilesGrid from '@/features/profilesGrid/ProfilesGrid';
import { openCartDrawer } from '@/utils/cartEvents';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 });
  const [sellerFilter, setSellerFilter] = useState('all'); // 'all', 'verified', 'new'
  const [sellerEmailFilter, setSellerEmailFilter] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { addItem: addShopifyItem } = useShopCart();

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

  // Support deep-links from profile cards:
  // - Preferred: /market?created_by=email (matches product.created_by)
  // - Back-compat: /market?seller=email
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const createdBy = params.get('created_by');
      const seller = params.get('seller');
      const raw = createdBy || seller;
      if (raw) {
        setActiveTab('p2p');
        setSellerEmailFilter(normalizeEmail(raw));
        setPage(1);
      } else {
        setSellerEmailFilter(null);
      }
    } catch {
      setSellerEmailFilter(null);
    }
  }, [location.search]);

  // Support Bible-friendly collection deep-links:
  // - /market/:collection (redirects to /market?collection=...)
  // - /market?collection=...
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const raw = params.get('collection');
      if (raw) {
        setSelectedCollection(String(raw));
        setPage(1);
      }
    } catch {
      // ignore
    }
  }, [location.search]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return;
        
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ['marketplace-products'],
    // Some legacy rows may not use status='active'. Fetch all and filter client-side.
    queryFn: () => base44.entities.Product.filter({}, '-created_date'),
  });

  const allProducts = useMemo(() => {
    const products = Array.isArray(rawProducts) ? rawProducts : [];
    return products.filter((p) => String(p?.status || '').toLowerCase() !== 'draft');
  }, [rawProducts]);

  // Defensive UI-side dedupe (some environments may still have duplicate Shopify imports).
  const uniqueProducts = useMemo(() => {
    const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
    const normalizeDetails = (details) => {
      if (!details) return {};
      if (typeof details === 'object') return details;
      if (typeof details === 'string') {
        try {
          const parsed = JSON.parse(details);
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
          return {};
        }
      }
      return {};
    };

    const pickPreferred = (current, candidate) => {
      if (!current) return candidate;
      if (!candidate) return current;

      const currentImages = Array.isArray(current.image_urls) ? current.image_urls.length : 0;
      const candidateImages = Array.isArray(candidate.image_urls) ? candidate.image_urls.length : 0;
      if (candidateImages > currentImages) return candidate;
      if (currentImages > candidateImages) return current;

      const currentUpdated = Date.parse(current.updated_at || current.updated_date || current.created_at || current.created_date || 0) || 0;
      const candidateUpdated = Date.parse(candidate.updated_at || candidate.updated_date || candidate.created_at || candidate.created_date || 0) || 0;
      return candidateUpdated > currentUpdated ? candidate : current;
    };

    const getKey = (product) => {
      const sellerEmail = normalizeEmail(product?.seller_email);
      const details = normalizeDetails(product?.details);

      const isShopifyImport =
        sellerEmail === 'shopify@hotmess.london' ||
        !!details?.shopify_id ||
        !!details?.shopify_handle ||
        !!details?.shopify_variant_id;

      if (!isShopifyImport) return null;

      const sid = details?.shopify_id ? String(details.shopify_id) : null;
      const handle = details?.shopify_handle ? String(details.shopify_handle) : null;
      const variant = details?.shopify_variant_id ? String(details.shopify_variant_id) : null;
      const name = String(product?.name || '').trim().toLowerCase();

      if (sid) return `shopify:id:${sid}`;
      if (handle) return `shopify:handle:${handle}`;
      if (variant) return `shopify:variant:${variant}`;
      return name ? `shopify:name:${name}` : null;
    };

    const products = Array.isArray(allProducts) ? allProducts : [];
    const byKey = new Map();
    const out = [];

    for (const p of products) {
      const key = getKey(p);
      if (!key) {
        out.push(p);
        continue;
      }

      const existing = byKey.get(key);
      const preferred = pickPreferred(existing, p);
      byKey.set(key, preferred);
    }

    // Keep original ordering as much as possible.
    const seen = new Set();
    for (const p of products) {
      const key = getKey(p);
      if (!key) continue;
      const winner = byKey.get(key);
      const winnerId = winner?.id ? String(winner.id) : key;
      if (seen.has(winnerId)) continue;
      seen.add(winnerId);
      out.push(winner);
    }

    return out;
  }, [allProducts]);

  const purchaseMutation = useMutation({
    mutationFn: async (product) => {
      // Check if this is a P2P marketplace product
      const isP2P = product.seller_email !== 'shopify@hotmess.london';
      const platformFee = isP2P ? product.price_xp * 0.1 : 0;
      const sellerAmount = isP2P ? product.price_xp - platformFee : product.price_xp;

      const order = await base44.entities.Order.create({
        buyer_email: currentUser.email,
        seller_email: product.seller_email,
        total_xp: product.price_xp,
        status: isP2P ? 'escrow' : 'pending',
        payment_method: 'xp',
      });

      await base44.entities.OrderItem.create({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price_xp: product.price_xp,
      });

      const newXp = (currentUser.xp || 0) - product.price_xp;
      await base44.auth.updateMe({ xp: newXp });

      await base44.entities.Product.update(product.id, {
        sales_count: (product.sales_count || 0) + 1,
        inventory_count: Math.max(0, (product.inventory_count || 0) - 1),
      });

      // For P2P purchases, create a temporary beacon at buyer's fuzzy location
      if (isP2P && navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          
          // Import snap function
          const snapToGrid = (lat, lng) => {
            const GRID_SIZE = 0.0045;
            return {
              lat: Math.floor(lat / GRID_SIZE) * GRID_SIZE,
              lng: Math.floor(lng / GRID_SIZE) * GRID_SIZE
            };
          };
          
          const snapped = snapToGrid(position.coords.latitude, position.coords.longitude);
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          
          await base44.entities.Beacon.create({
            title: `P2P Purchase: ${product.name}`,
            description: `${currentUser.full_name || 'Someone'} just bought this!`,
            kind: 'drop',
            mode: 'drop',
            lat: snapped.lat,
            lng: snapped.lng,
            city: currentUser.city || 'London',
            xp_scan: 50,
            product_id: product.id,
            purchase_amount: product.price_xp,
            active: true,
            status: 'published',
            expires_at: expiresAt,
          });
        } catch (error) {
          console.log('Failed to create P2P beacon:', error);
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketplace-products']);
      toast.success('Purchase successful!');
      navigate(createPageUrl('OrderHistory'));
    },
    onError: () => {
      toast.error('Purchase failed');
    },
  });

  const handleBuy = (product) => {
    const isShopifyProduct = String(product?.seller_email || '').toLowerCase() === 'shopify@hotmess.london';
    const details = (() => {
      const raw = product?.details;
      if (!raw) return {};
      if (typeof raw === 'object') return raw;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
          return {};
        }
      }
      return {};
    })();

    const hasMultipleVariants = Array.isArray(details?.shopify_variants) && details.shopify_variants.length > 1;

    // Official Shopify items should always be purchasable (guest or member).
    // Route them through cart/checkout instead of XP-gated instant purchase.
    if (isShopifyProduct) {
      if (hasMultipleVariants) {
        toast.success('Choose a size');
        const handle = details?.shopify_handle ? String(details.shopify_handle).trim() : null;
        navigate(handle ? `/market/p/${encodeURIComponent(handle)}` : createPageUrl(`ProductDetail?id=${product.id}`));
        return;
      }

      const variants = Array.isArray(details?.shopify_variants) ? details.shopify_variants : [];
      const idFromDetails = details?.shopify_variant_id ? String(details.shopify_variant_id).trim() : null;
      const idFromFirstVariant = variants?.[0]?.id ? String(variants[0].id).trim() : null;
      const variantId = idFromDetails || idFromFirstVariant || null;

      if (!variantId) {
        toast.error('Missing variant');
        return;
      }

      addShopifyItem({ variantId, quantity: 1 })
        .then(() => {
          toast.success('Added to cart!');
          openCartDrawer('shopify');
        })
        .catch((error) => toast.error(error?.message || 'Failed to add to cart'));
      return;
    }

    if (!currentUser) {
      addToCart({ productId: product.id, quantity: 1, currentUser: null })
        .then(() => {
          toast.success('Added to cart! Sign in at checkout to complete.');
          openCartDrawer('creators');
        })
        .catch((error) => toast.error(error?.message || 'Failed to add to cart'));
      return;
    }

    if ((currentUser.xp || 0) < product.price_xp) {
      toast.error('Insufficient XP');
      return;
    }

    if (product.min_xp_level && (currentUser.xp || 0) < product.min_xp_level) {
      toast.error(`Requires Level ${Math.floor(product.min_xp_level / 1000) + 1}+`);
      return;
    }

    const isOutOfStock = product.status === 'sold_out' || (product.inventory_count !== undefined && product.inventory_count <= 0);
    if (isOutOfStock) {
      toast.error('Product sold out');
      return;
    }

    purchaseMutation.mutate(product);
  };

  let filteredProducts = uniqueProducts;
  
  if (activeTab === 'official') {
    filteredProducts = uniqueProducts.filter(p => p.seller_email === 'shopify@hotmess.london');
  } else if (activeTab === 'p2p') {
    filteredProducts = uniqueProducts.filter(p => p.seller_email !== 'shopify@hotmess.london');
  } else if (activeTab !== 'all') {
    filteredProducts = uniqueProducts.filter(p => p.product_type === activeTab);
  }

  if (selectedCollection) {
    filteredProducts = filteredProducts.filter(p => 
      p.tags?.some(tag => tag.toLowerCase() === selectedCollection.toLowerCase())
    );
  }

  if (searchQuery) {
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  // Price range filter
  filteredProducts = filteredProducts.filter(p => 
    p.price_xp >= priceRange.min && p.price_xp <= priceRange.max
  );

  // Seller filter
  if (sellerFilter === 'verified') {
    filteredProducts = filteredProducts.filter(p => 
      p.seller_verified || (p.average_rating && p.average_rating >= 4.5)
    );
  } else if (sellerFilter === 'new') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filteredProducts = filteredProducts.filter(p => 
      new Date(p.created_date) >= thirtyDaysAgo
    );
  }

  // Seller deep-link filter (explicit seller email)
  if (sellerEmailFilter) {
    filteredProducts = filteredProducts.filter((p) => {
      const createdBy = normalizeEmail(p?.created_by);
      const sellerEmail = normalizeEmail(p?.seller_email);
      return createdBy === sellerEmailFilter || sellerEmail === sellerEmailFilter;
    });
  }

  if (sortBy === 'price_low') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price_xp - b.price_xp);
  } else if (sortBy === 'price_high') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price_xp - a.price_xp);
  } else if (sortBy === 'popular') {
    filteredProducts = [...filteredProducts].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
  } else if (sortBy === 'rating') {
    filteredProducts = [...filteredProducts].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
  }

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-8">
        <GridSkeleton count={9} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight mb-2">
                THE <span className="text-[#00D9FF]">SHOP</span>
              </h1>
              <p className="text-white/60 uppercase text-sm tracking-wider">
                Official Gear + P2P Mess Market (10% Platform Fee)
              </p>
              {sellerEmailFilter && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/70">
                  <span className="rounded-sm border border-white/20 bg-white/5 px-2 py-1">
                    Showing creator: <span className="font-mono text-white/90">{sellerEmailFilter}</span>
                  </span>
                  <button
                    type="button"
                    className="underline text-white/70 hover:text-white"
                    onClick={() => navigate(createPageUrl('Marketplace'))}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => openCartDrawer('creators')}
                variant="outline"
                className="border-[#39FF14] text-[#39FF14] w-full sm:w-auto"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Cart
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl('SellerDashboard'))}
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Sell Item
              </Button>
            </div>
          </div>

          {/* Collections */}
          <ShopCollections 
            onSelectCollection={(id) => {
              setSelectedCollection(id === selectedCollection ? null : id);
              setPage(1);
            }}
          />

          {selectedCollection && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-white/60">Filtered by:</span>
              <button
                onClick={() => setSelectedCollection(null)}
                className="px-3 py-1 bg-[#FF1493] text-black text-xs font-black uppercase hover:opacity-90"
              >
                {selectedCollection} ✕
              </button>
            </div>
          )}

          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Seller Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sellers</SelectItem>
                  <SelectItem value="verified">Verified Only</SelectItem>
                  <SelectItem value="new">New Listings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range Filter */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <label className="text-xs uppercase tracking-wider text-white/60 mb-3 block">
                Price Range: {priceRange.min} - {priceRange.max >= 50000 ? '50000+' : priceRange.max} XP
              </label>
              <Slider
                value={[priceRange.min, priceRange.max]}
                onValueChange={([min, max]) => setPriceRange({ min, max })}
                min={0}
                max={50000}
                step={500}
                className="w-full"
              />
            </div>
          </div>
        </motion.div>

        <div className="mb-8">
          <ProfilesGrid
            showHeader
            headerTitle="Top Sellers"
            showTelegramFeedButton={false}
            hideWhenEmpty
            maxItems={8}
            filterProfiles={(p) => String(p?.profileType || '').toLowerCase() === 'seller'}
            containerClassName="mx-0 max-w-none p-0"
            onNavigateUrl={(url) => navigate(url)}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-white/5 border border-white/10 w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="shrink-0 data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              All ({uniqueProducts.length})
            </TabsTrigger>
            <TabsTrigger value="official" className="shrink-0 data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black">
              Official Shop
            </TabsTrigger>
            <TabsTrigger value="p2p" className="shrink-0 data-[state=active]:bg-[#B026FF] data-[state=active]:text-white">
              P2P Market
            </TabsTrigger>
            <TabsTrigger value="physical" className="shrink-0 data-[state=active]:bg-[#FFEB3B] data-[state=active]:text-black">
              Physical
            </TabsTrigger>
            <TabsTrigger value="digital" className="shrink-0 data-[state=active]:bg-[#39FF14] data-[state=active]:text-black">
              Digital
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {currentUser && activeTab === 'all' && !searchQuery && (
              <AIRecommendations 
                currentUser={currentUser} 
                onBuy={handleBuy}
              />
            )}
            
            {paginatedProducts.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No products found"
                description={searchQuery ? "Try a different search term" : "Be the first to list a product!"}
                action={() => navigate(createPageUrl('SellerDashboard'))}
                actionLabel="Start Selling"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedProducts.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={idx}
                      onBuy={handleBuy}
                      currentUserXP={currentUser?.xp || 0}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      className="border-white/20"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-white/60">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      variant="outline"
                      className="border-white/20"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TutorialTooltip page="marketplace" />
    </div>
  );
}