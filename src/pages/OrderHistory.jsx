import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, CheckCircle, Clock, XCircle, Unlock, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import MessageButton from '../components/social/MessageButton';
import QRCodeGenerator from '../components/orders/QRCodeGenerator';
import OrderQRScanner from '../components/orders/OrderQRScanner';
import MarketplaceReviewModal from '../components/marketplace/MarketplaceReviewModal';

const STATUS_CONFIG = {
  pending: { color: '#FFEB3B', icon: Clock },
  escrow: { color: '#00D9FF', icon: Clock },
  processing: { color: '#00D9FF', icon: Package },
  shipped: { color: '#B026FF', icon: Package },
  delivered: { color: '#39FF14', icon: CheckCircle },
  cancelled: { color: '#FF073A', icon: XCircle },
  refunded: { color: '#FF6B35', icon: XCircle },
};

export default function OrderHistory() {
  const [currentUser, setCurrentUser] = useState(null);
  const [reviewingOrder, setReviewingOrder] = useState(null);
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

  const { data: buyerOrders = [], isLoading: loadingBuyer } = useQuery({
    queryKey: ['buyer-orders', currentUser?.email],
    queryFn: () => base44.entities.Order.filter({ buyer_email: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
  });

  const { data: sellerOrders = [], isLoading: loadingSeller } = useQuery({
    queryKey: ['seller-orders', currentUser?.email],
    queryFn: () => base44.entities.Order.filter({ seller_email: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
  });

  const { data: allOrderItems = [] } = useQuery({
    queryKey: ['order-items'],
    queryFn: () => base44.entities.OrderItem.list(),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ['my-reviews', currentUser?.email],
    queryFn: () => base44.entities.MarketplaceReview.filter({ reviewer_email: currentUser.email }),
    enabled: !!currentUser
  });

  const isLoading = loadingBuyer || loadingSeller;

  const releaseEscrowMutation = useMutation({
    mutationFn: async (order) => {
      await base44.entities.Order.update(order.id, { status: 'processing' });
      
      // Notify seller
      await base44.entities.Notification.create({
        user_email: order.seller_email,
        type: 'escrow_release',
        title: 'Payment Released',
        message: `Buyer released payment for order #${order.id.slice(0, 8)}. Funds will be available soon.`,
        link: `OrderHistory`,
        metadata: { order_id: order.id }
      });
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buyer-orders']);
      queryClient.invalidateQueries(['seller-orders']);
      toast.success('Payment released to seller!');
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async (order) => {
      const orderItems = allOrderItems.filter(item => item.order_id === order.id);
      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + 30);

      // Add all items to cart
      for (const item of orderItems) {
        const product = allProducts.find(p => p.id === item.product_id);
        
        if (!product || product.status === 'sold_out' || product.inventory_count <= 0) {
          toast.warning(`${item.product_name} is no longer available`);
          continue;
        }

        const cartOwnerFilter = currentUser?.auth_user_id
          ? { auth_user_id: currentUser.auth_user_id, product_id: item.product_id }
          : { user_email: currentUser.email, product_id: item.product_id };

        const existingCartItems = await base44.entities.CartItem.filter(cartOwnerFilter);

        if (existingCartItems.length > 0) {
          await base44.entities.CartItem.update(existingCartItems[0].id, {
            quantity: existingCartItems[0].quantity + item.quantity,
            reserved_until: reservedUntil.toISOString()
          });
        } else {
          await base44.entities.CartItem.create({
            ...(currentUser?.auth_user_id ? { auth_user_id: currentUser.auth_user_id } : {}),
            user_email: currentUser.email,
            product_id: item.product_id,
            quantity: item.quantity,
            reserved_until: reservedUntil.toISOString()
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Items added to cart!');
    },
    onError: (error) => {
      toast.error('Failed to reorder: ' + error.message);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-white/40 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60">Loading orders...</p>
        </div>
      </div>
    );
  }

  const renderOrder = (order, idx, isSeller = false) => {
    const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    const orderItems = allOrderItems.filter(item => item.order_id === order.id);
    const otherPartyEmail = isSeller ? order.buyer_email : order.seller_email;
    const otherParty = allUsers.find(u => u.email === otherPartyEmail);
    const hasReviewed = myReviews.some(r => r.order_id === order.id);
    const canReview = (order.status === 'delivered' || order.is_qr_scanned) && !hasReviewed;

    return (
      <motion.div
        key={order.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Icon className="w-5 h-5" style={{ color: config.color }} />
              <h3 className="font-bold">Order #{order.id.slice(0, 8)}</h3>
              <Badge style={{ backgroundColor: config.color, color: '#000' }}>
                {order.status}
              </Badge>
            </div>
            <p className="text-sm text-white/60">
              {isSeller ? `Buyer: ${order.buyer_email}` : `Seller: ${order.seller_email}`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-[#FFEB3B] mb-1">
              {order.total_xp.toLocaleString()} XP
            </div>
            <p className="text-xs text-white/40">
              {format(new Date(order.created_date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {orderItems.length > 0 && (
          <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">Order Items</p>
              {!isSeller && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reorderMutation.mutate(order)}
                  disabled={reorderMutation.isPending}
                  className="border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/10 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reorder
                </Button>
              )}
            </div>
            {orderItems.map(item => {
              const product = allProducts.find(p => p.id === item.product_id);
              return (
                <div key={item.id} className="flex items-center gap-3">
                  {product?.image_urls?.[0] && (
                    <img 
                      src={product.image_urls[0]} 
                      alt={item.product_name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <Link 
                      to={createPageUrl(`ProductDetail?id=${item.product_id}`)}
                      className="text-white hover:text-[#FF1493] transition-colors font-semibold block"
                    >
                      {item.product_name}
                    </Link>
                    <p className="text-xs text-white/40">
                      Qty: {item.quantity} × {item.price_xp.toLocaleString()} XP
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#FFEB3B]">
                    {(item.price_xp * item.quantity).toLocaleString()} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {order.tracking_number && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Tracking</p>
            <p className="font-mono text-sm">{order.tracking_number}</p>
          </div>
        )}

        {order.notes && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-white/80">{order.notes}</p>
          </div>
        )}

        {/* Escrow Release for Buyer */}
        {!isSeller && order.status === 'escrow' && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="bg-[#00D9FF]/20 border border-[#00D9FF]/40 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#00D9FF]" />
                <p className="text-sm font-bold uppercase text-[#00D9FF]">Payment in Escrow</p>
              </div>
              <p className="text-xs text-white/60 mb-3">
                Your payment is held securely. Release it once you receive the item.
              </p>
            </div>
            <Button
              onClick={() => {
                if (confirm('Release payment to seller? This action cannot be undone.')) {
                  releaseEscrowMutation.mutate(order);
                }
              }}
              disabled={releaseEscrowMutation.isPending}
              className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black"
            >
              <Unlock className="w-4 h-4 mr-2" />
              {releaseEscrowMutation.isPending ? 'Releasing...' : 'Release Payment'}
            </Button>
          </div>
        )}

        {/* QR Code for Seller */}
        {isSeller && order.status !== 'cancelled' && order.status !== 'refunded' && !order.is_qr_scanned && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase mb-3">Attach this QR code to the item</p>
            <QRCodeGenerator orderId={order.id} size={150} />
          </div>
        )}

        {/* QR Scanner for Buyer */}
        {!isSeller && order.status !== 'cancelled' && order.status !== 'refunded' && !order.is_qr_scanned && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <OrderQRScanner order={order} currentUser={currentUser} />
          </div>
        )}

        {/* Delivery Confirmed Badge */}
        {order.is_qr_scanned && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-[#39FF14]">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="text-sm font-bold uppercase">Delivered & Confirmed</p>
              <p className="text-xs text-white/60">
                {format(new Date(order.qr_scanned_at), 'MMM d, yyyy • h:mm a')}
              </p>
            </div>
          </div>
        )}

        {otherParty && currentUser && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <MessageButton
              targetUser={otherParty}
              currentUser={currentUser}
              threadType="order"
              metadata={{ order_id: order.id }}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white"
            />
            {canReview && (
              <Button
                onClick={() => setReviewingOrder(order)}
                className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black"
              >
                Leave Review
              </Button>
            )}
            {hasReviewed && (
              <div className="text-xs text-white/40 text-center py-2">
                ✓ Review submitted
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
            Order History
          </h1>
          <p className="text-white/60">Track your purchases and sales</p>
        </motion.div>

        <Tabs defaultValue="purchases">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="purchases">
              Purchases ({buyerOrders.length})
            </TabsTrigger>
            <TabsTrigger value="sales">
              Sales ({sellerOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            {buyerOrders.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg mb-4">No purchases yet</p>
                <Link 
                  to="/market"
                  className="text-[#FF1493] hover:underline"
                >
                  Browse Market
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {buyerOrders.map((order, idx) => renderOrder(order, idx, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales">
            {sellerOrders.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-lg mb-4">No sales yet</p>
                <Link 
                  to={createPageUrl('SellerDashboard')}
                  className="text-[#FF1493] hover:underline"
                >
                  Start Selling
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sellerOrders.map((order, idx) => renderOrder(order, idx, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {currentUser && (
          <MarketplaceReviewModal
            isOpen={!!reviewingOrder}
            onClose={() => setReviewingOrder(null)}
            order={reviewingOrder}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}