import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function SellerDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['seller-products', currentUser?.email],
    queryFn: () => base44.entities.Product.filter({ seller_email: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['seller-orders', currentUser?.email],
    queryFn: () => base44.entities.Order.filter({ seller_email: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['order-items'],
    queryFn: () => base44.entities.OrderItem.list(),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', currentUser?.email],
    queryFn: () => base44.entities.Promotion.filter({ seller_email: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['seller-payouts', currentUser?.email],
    queryFn: () => base44.entities.SellerPayout.filter({ seller_email: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Enrich orders with their items
  const enrichedOrders = orders.map(order => ({
    ...order,
    items: orderItems.filter(item => item.order_id === order.id)
  }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create({ ...data, seller_email: currentUser.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-products']);
      setShowForm(false);
      toast.success('Product created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-products']);
      setShowForm(false);
      setEditingProduct(null);
      toast.success('Product updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-products']);
      toast.success('Product deleted');
    },
  });

  const handleSubmit = (data) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
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
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
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
                <Package className="w-5 h-5 text-[#00D9FF]" />
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
                <DollarSign className="w-5 h-5 text-[#FFEB3B]" />
                <span className="text-xs text-white/40 uppercase">Revenue</span>
              </div>
              <div className="text-3xl font-black text-[#FFEB3B]">{totalRevenue.toLocaleString()} XP</div>
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
        {currentUser && <InventoryAlerts sellerEmail={currentUser.email} />}

        {/* Seller Rating Display */}
        {currentUser && <SellerRatingDisplay sellerEmail={currentUser.email} />}

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
                <Button onClick={() => setShowForm(true)} className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black">
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
                            <span className="ml-2 font-bold text-[#FFEB3B]">{product.price_xp.toLocaleString()} XP</span>
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
                        <div className="text-xl font-black text-[#FFEB3B] mb-1">
                          {order.total_xp.toLocaleString()} XP
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
            <OffersList userEmail={currentUser?.email} type="received" />
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
              sellerEmail={currentUser?.email}
            />
          </TabsContent>

          <TabsContent value="disputes">
            <DisputeResolution sellerEmail={currentUser?.email} />
          </TabsContent>

          <TabsContent value="promotions">
            <PromotionManager
              promotions={promotions}
              products={products}
              sellerEmail={currentUser?.email}
            />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutManager
              payouts={payouts}
              orders={enrichedOrders}
              sellerEmail={currentUser?.email}
              stripeConnectId={currentUser?.stripe_connect_id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}