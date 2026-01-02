import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
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
      const order = await base44.entities.Order.create({
        buyer_email: currentUser.email,
        seller_email: product.seller_email,
        total_xp: product.price_xp,
        status: 'pending',
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
      toast.error('Please log in to purchase');
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

  let filteredProducts = activeTab === 'all' 
    ? allProducts 
    : allProducts.filter(p => p.product_type === activeTab);

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

  if (sortBy === 'price_low') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price_xp - b.price_xp);
  } else if (sortBy === 'price_high') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price_xp - a.price_xp);
  } else if (sortBy === 'popular') {
    filteredProducts = [...filteredProducts].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
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
                SHOP THE DROP
              </h1>
              <p className="text-white/60 uppercase text-sm tracking-wider">
                RAW / HUNG / HIGH / SUPER + HNH MESS. No filler. No shame.
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
          <div className="flex flex-col md:flex-row gap-4 mb-6">
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
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              All ({allProducts.length})
            </TabsTrigger>
            <TabsTrigger value="physical" className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black">
              Physical
            </TabsTrigger>
            <TabsTrigger value="digital" className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-black">
              Digital
            </TabsTrigger>
            <TabsTrigger value="ticket" className="data-[state=active]:bg-[#FFEB3B] data-[state=active]:text-black">
              Tickets
            </TabsTrigger>
            <TabsTrigger value="merch" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              Merch
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

      {currentUser && (
        <CartDrawer 
          isOpen={showCart} 
          onClose={() => setShowCart(false)} 
          currentUser={currentUser} 
        />
      )}

      <TutorialTooltip page="marketplace" />
    </div>
  );
}