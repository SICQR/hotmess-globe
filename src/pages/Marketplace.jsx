import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
import CartDrawer from '../components/marketplace/CartDrawer';
import TutorialTooltip from '../components/tutorial/TutorialTooltip';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { addToCart } from '@/components/marketplace/cartStorage';

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 });
  const [sellerFilter, setSellerFilter] = useState('all'); // 'all', 'verified', 'new'
  const [currentUser, setCurrentUser] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['marketplace-products'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }, '-created_date'),
  });

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
    if (!currentUser) {
      addToCart({ productId: product.id, quantity: 1, currentUser: null })
        .then(() => {
          toast.success('Added to cart! Sign in at checkout to complete.');
          setShowCart(true);
        })
        .catch(() => toast.error('Failed to add to cart'));
      return;
    }

    // Check if this is an official Shopify product (Level 3+ required)
    const isShopifyProduct = product.seller_email === 'shopify@hotmess.london';
    const userLevel = Math.floor((currentUser.xp || 0) / 1000) + 1;
    
    if (isShopifyProduct && userLevel < 3) {
      toast.error('Reach Level 3 to access the Official Shop');
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

  let filteredProducts = allProducts;
  
  if (activeTab === 'official') {
    filteredProducts = allProducts.filter(p => p.seller_email === 'shopify@hotmess.london');
  } else if (activeTab === 'p2p') {
    filteredProducts = allProducts.filter(p => p.seller_email !== 'shopify@hotmess.london');
  } else if (activeTab !== 'all') {
    filteredProducts = allProducts.filter(p => p.product_type === activeTab);
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight mb-2">
                THE <span className="text-[#00D9FF]">SHOP</span>
              </h1>
              <p className="text-white/60 uppercase text-sm tracking-wider">
                Official Gear (Level 3+) + P2P Mess Market (10% Platform Fee)
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowCart(true)}
                variant="outline"
                className="border-[#39FF14] text-[#39FF14]"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Cart
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl('SellerDashboard'))}
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              All ({allProducts.length})
            </TabsTrigger>
            <TabsTrigger value="official" className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black">
              Official Shop
            </TabsTrigger>
            <TabsTrigger value="p2p" className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-black">
              P2P Market
            </TabsTrigger>
            <TabsTrigger value="physical" className="data-[state=active]:bg-[#FFEB3B] data-[state=active]:text-black">
              Physical
            </TabsTrigger>
            <TabsTrigger value="digital" className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black">
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

      <CartDrawer 
        isOpen={showCart} 
        onClose={() => setShowCart(false)} 
        currentUser={currentUser} 
      />

      <TutorialTooltip page="marketplace" />
    </div>
  );
}