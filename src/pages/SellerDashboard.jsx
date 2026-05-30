import { supabase } from '@/components/utils/supabaseClient';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, DollarSign, Star, TrendingUp, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ProductForm from '../components/marketplace/ProductForm';
import SalesAnalytics from '../components/seller/SalesAnalytics';
import PromotionManager from '../components/seller/PromotionManager';
import PayoutManager from '../components/seller/PayoutManager';
import InventoryAlerts from '../components/seller/InventoryAlerts';
import OffersList from '../components/marketplace/OffersList';
import DisputeResolution from '../components/seller/DisputeResolution';
import FeaturedListingsManager from '../components/seller/FeaturedListingsManager';
import SellerRatingDisplay from '../components/seller/SellerRatingDisplay';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errorUtils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  insertBeaconForP2PListing, 
  deleteBeaconForP2PListing, 
  dispatchWorldPulse 
} from '@/hooks/useP2PListingBeacon';

export default function SellerDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setCurrentUser(null);
          return;
        }
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
        setCurrentUser({ ...authUser, ...(profile || {}), auth_user_id: authUser.id, email: authUser.email || profile?.email });
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['seller-products', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const { data, error } = await supabase.from('market_listings').select('*')
          .eq('seller_id', currentUser.id)
          .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['seller-orders', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const { data, error } = await supabase.from('orders').select('*')
          .eq('seller_id', currentUser.id)
          .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['order-items', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const { data, error } = await supabase.from('order_items').select('*');
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const { data, error } = await supabase.from('promotions').select('*').eq('seller_id', currentUser.id).order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['seller-payouts', currentUser?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('seller_payouts').select('*')
          .eq('seller_id', currentUser.id)
          .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUser,
  });

  // Enrich orders with their items
  const enrichedOrders = orders.map(order => ({
    ...order,
    items: orderItems.filter(item => item.order_id === order.id)
  }));

  const createMutation = useMutation({
    mutationFn: (data) => supabase.from('market_listings').insert({ ...data, seller_id: currentUser.id }),
    onSuccess: async (createdProduct) => {
      queryClient.invalidateQueries(['seller-products']);
      setShowForm(false);
      toast.success('Product created!');

      // Wire to Globe: Create Gold beacon for P2P listing
      const promoterId = currentUser?.auth_user_id ?? currentUser?.id;
      if (promoterId && createdProduct) {
        await insertBeaconForP2PListing(createdProduct, promoterId);
        dispatchWorldPulse('GOLD_DROP', '#C8962C');
      }
    },
    onError: (error) => {
      toast.error(humanizeError(error, 'Failed to create product'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.from('market_listings').update(data).eq('id', id),
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-products']);
      setShowForm(false);
      setEditingProduct(null);
      toast.success('Product updated!');
    },
    onError: (error) => {
      toast.error(humanizeError(error, 'Failed to update product'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.from('market_listings').delete().eq('id', id),
    onSuccess: async (_, deletedId) => {
      queryClient.invalidateQueries(['seller-products']);
      toast.success('Product deleted');

      // Wire to Globe: Remove beacon for deleted P2P listing
      if (deletedId) {
        await deleteBeaconForP2PListing(deletedId);
        dispatchWorldPulse('BEACON_REMOVED', '#C8962C');
      }
    },
    onError: (error) => {
      toast.error(humanizeError(error, 'Failed to delete product'));
    },
  });

  const normalizeProductPayload = (data) => {
    const toIntOrNull = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return Number.isFinite(num) ? num : null;
    };

    return {
      ...data,
      price_xp: toIntOrNull(data?.price_xp) ?? 0,
      inventory_count: toIntOrNull(data?.inventory_count) ?? 0,
    };
  };

  const handleSubmit = (data) => {
    if (!currentUser?.email) {
      toast.error('Please sign in to create products');
      return;
    }

    const normalized = normalizeProductPayload(data);
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: normalized });
    } else {
      createMutation.mutate(normalized);
    }
  };

  const totalSales = products.reduce((sum, p) => sum + (p.sales_count || 0), 0);
  const totalRevenue = products.reduce((sum, p) => sum + ((p.sales_count || 0) * p.price_xp), 0);
  const avgRating = products.filter(p => p.average_rating).reduce((sum, p, _, arr) => sum + p.average_rating / arr.length, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-white/40 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading dashboard...</p>
        </div>
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
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
                Seller Dashboard
              </h1>
              <p className="text-white/60">Manage your products and orders</p>
            </div>
            {!showForm && (
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Product
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-[#00C2E0]" />
                <span className="text-xs text-white/40 uppercase">Products</span>
              </div>
              <div className="text-3xl font-black">{products.length}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-[#39FF14]" />
                <span className="text-xs text-white/40 uppercase">Sales</span>
              </div>
              <div className="text-3xl font-black">{totalSales}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-[#C8962C]" />
                <span className="text-xs text-white/40 uppercase">Revenue</span>
              </div>
              <div className="text-3xl font-black text-[#C8962C]">£{totalRevenue.toLocaleString()}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-5 h-5 text-[#FF6B35]" />
                <span className="text-xs text-white/40 uppercase">Avg Rating</span>
              </div>
              <div className="text-3xl font-black">{avgRating ? avgRating.toFixed(1) : 'N/A'}</div>
            </div>
          </div>
        </motion.div>

        {/* Inventory Alerts */}
        {currentUser && <InventoryAlerts sellerId={currentUser.id} />}

        {/* Seller Rating Display */}
        {currentUser && <SellerRatingDisplay sellerId={currentUser.id} />}

        {showForm && (
          <div className="mb-8">
            <ProductForm
              product={editingProduct}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            />
          </div>
        )}

        <Tabs defaultValue="products">
          <TabsList className="bg-white/5 border border-white/10 mb-6 flex-wrap">
            <TabsTrigger value="products">My Products</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {products.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg mb-4">No products yet</p>
                <Button onClick={() => setShowForm(true)} className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Product
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-6"
                  >
                    <div className="flex items-start gap-6">
                      {product.image_urls?.[0] && (
                        <img src={product.image_urls[0]} alt={product.name} className="w-24 h-24 rounded-lg object-cover" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-bold mb-1">{product.name}</h3>
                            <p className="text-sm text-white/60">{product.description}</p>
                          </div>
                          <Badge variant={product.status === 'active' ? 'default' : 'outline'}>
                            {product.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 mt-4 text-sm">
                          <div>
                            <span className="text-white/40">Price:</span>
                            <span className="ml-2 font-bold text-[#C8962C]">£{(product.price_gbp || product.price_xp || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Stock:</span>
                            <span className="ml-2 font-bold">{product.inventory_count || 0}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Sales:</span>
                            <span className="ml-2 font-bold">{product.sales_count || 0}</span>
                          </div>
                          {product.average_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-[#FFEB3B] text-[#FFEB3B]" />
                              <span className="font-bold">{product.average_rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingProduct(product);
                            setShowForm(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this product?')) {
                              deleteMutation.mutate(product.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold mb-1">Order #{order.id.slice(0, 8)}</h3>
                        <p className="text-sm text-white/60">Buyer: {order.buyer_email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-[#C8962C] mb-1">
                          £{(order.total_gbp || order.total_xp || 0).toLocaleString()}
                        </div>
                        <Badge>{order.status}</Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offers">
            <OffersList sellerId={currentUser?.id} type="received" />
          </TabsContent>

          <TabsContent value="analytics">
            <SalesAnalytics
              orders={enrichedOrders}
              products={products}
              allUsers={allUsers}
            />
          </TabsContent>

          <TabsContent value="featured">
            <FeaturedListingsManager
              products={products}
              sellerId={currentUser?.id}
            />
          </TabsContent>

          <TabsContent value="disputes">
            <DisputeResolution sellerId={currentUser?.id} />
          </TabsContent>

          <TabsContent value="promotions">
            <PromotionManager
              promotions={promotions}
              products={products}
              sellerId={currentUser?.id}
            />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutManager
              payouts={payouts}
              orders={enrichedOrders}
              sellerId={currentUser?.id}
              stripeConnectId={currentUser?.stripe_connect_id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}