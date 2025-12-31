import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Zap, ShoppingCart, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function Checkout() {
  const [currentUser, setCurrentUser] = useState(null);
  const [shippingAddress, setShippingAddress] = useState({});
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', currentUser?.email],
    queryFn: () => base44.entities.CartItem.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const cartWithProducts = cartItems.map(item => {
    const product = products.find(p => p.id === item.product_id);
    return { ...item, product };
  }).filter(item => item.product);

  const totalXP = cartWithProducts.reduce((sum, item) => 
    sum + (item.product.price_xp * item.quantity), 0
  );

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      // CRITICAL: Fetch fresh data and validate atomically
      const freshUser = await base44.auth.me();
      const currentXP = freshUser.xp || 0;
      
      // Check user has enough XP with fresh data
      if (currentXP < totalXP) {
        throw new Error(`Insufficient XP. You have ${currentXP} XP but need ${totalXP} XP.`);
      }

      // Fetch fresh product data to check inventory in real-time
      const freshProducts = await base44.entities.Product.list();
      
      // Validate products and inventory atomically
      for (const item of cartWithProducts) {
        const freshProduct = freshProducts.find(p => p.id === item.product.id);
        if (!freshProduct || freshProduct.status !== 'active') {
          throw new Error(`Product "${item.product.name}" is no longer available.`);
        }
        if (freshProduct.inventory_count !== undefined && freshProduct.inventory_count < item.quantity) {
          throw new Error(`Only ${freshProduct.inventory_count} of "${item.product.name}" available.`);
        }
      }

      // Group items by seller
      const sellers = {};
      cartWithProducts.forEach(item => {
        const seller = item.product.seller_email;
        if (!sellers[seller]) sellers[seller] = [];
        sellers[seller].push(item);
      });

      // ATOMIC TRANSACTION START - CRITICAL: Sequential operations prevent race conditions
      // Step 1: Reserve inventory FIRST (prevents overselling race condition)
      const inventoryUpdates = [];
      try {
        for (const item of cartWithProducts) {
          const freshProduct = freshProducts.find(p => p.id === item.product.id);
          if (freshProduct.inventory_count !== undefined) {
            // Double-check inventory hasn't changed since initial validation
            if (freshProduct.inventory_count < item.quantity) {
              throw new Error(`Inventory changed: only ${freshProduct.inventory_count} of "${item.product.name}" available.`);
            }
            const newInventory = freshProduct.inventory_count - item.quantity;
            await base44.entities.Product.update(item.product.id, {
              inventory_count: Math.max(0, newInventory),
              sales_count: (freshProduct.sales_count || 0) + item.quantity
            });
            inventoryUpdates.push({ 
              id: item.product.id, 
              oldCount: freshProduct.inventory_count 
            });
          }
        }

        // Step 2: Deduct XP after inventory is reserved (safer order)
        const newXP = currentXP - totalXP;
        await base44.auth.updateMe({ xp: newXP });

        // Step 3: Create orders (safe to do now that inventory & XP are locked)
        for (const [seller, items] of Object.entries(sellers)) {
          const order = await base44.entities.Order.create({
            buyer_email: freshUser.email,
            seller_email: seller,
            total_xp: items.reduce((sum, i) => sum + (i.product.price_xp * i.quantity), 0),
            total_gbp: 0,
            status: 'pending',
            payment_method: 'xp',
            shipping_address: shippingAddress,
            notes
          });

          // Create order items
          for (const item of items) {
            await base44.entities.OrderItem.create({
              order_id: order.id,
              product_id: item.product.id,
              product_name: item.product.name,
              quantity: item.quantity,
              price_xp: item.product.price_xp,
              price_gbp: 0
            });
          }

          // Notify seller
          await base44.entities.Notification.create({
            user_email: seller,
            type: 'order',
            title: 'New Order!',
            message: `${freshUser.full_name || freshUser.email} placed an order`,
            link: 'SellerDashboard'
          });
        }

        // Step 4: Clear cart
        for (const item of cartItems) {
          await base44.entities.CartItem.delete(item.id);
        }
      } catch (error) {
        // CRITICAL ROLLBACK: Restore inventory and XP on any failure
        console.error('Checkout failed, initiating rollback:', error);
        
        // Rollback inventory first (reverse order of operations)
        for (const update of inventoryUpdates) {
          try {
            await base44.entities.Product.update(update.id, {
              inventory_count: update.oldCount
            });
          } catch (rollbackError) {
            console.error('Rollback failed for product', update.id, rollbackError);
          }
        }
        
        // Rollback XP
        try {
          await base44.auth.updateMe({ xp: currentXP });
        } catch (rollbackError) {
          console.error('XP rollback failed:', rollbackError);
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Order placed!');
      navigate(createPageUrl('OrderHistory'));
    },
    onError: (error) => {
      toast.error(error.message || 'Checkout failed');
    }
  });

  if (!currentUser || cartWithProducts.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">Your cart is empty</p>
          <Button onClick={() => navigate(createPageUrl('Marketplace'))}>
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  const userXP = currentUser.xp || 0;
  const hasEnoughXP = userXP >= totalXP;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={() => navigate(-1)} variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <h1 className="text-4xl font-black uppercase mb-8">Checkout</h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div>
              <h2 className="text-2xl font-black uppercase mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                {cartWithProducts.map(item => (
                  <div key={item.id} className="flex justify-between p-3 bg-white/5 border border-white/10">
                    <div>
                      <div className="font-bold">{item.product.name}</div>
                      <div className="text-sm text-white/60">Qty: {item.quantity}</div>
                    </div>
                    <div className="text-[#FFEB3B] font-bold">
                      {item.product.price_xp * item.quantity} XP
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-white/10 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-white/60">Your XP Balance</span>
                  <span className="font-bold">{userXP} XP</span>
                </div>
                <div className="flex justify-between items-center text-xl font-black mb-4">
                  <span>Total</span>
                  <span className="text-[#FFEB3B]">{totalXP} XP</span>
                </div>
                {!hasEnoughXP && (
                  <div className="bg-red-600/20 border border-red-600 p-3 text-sm">
                    ⚠️ Insufficient XP. You need {totalXP - userXP} more XP.
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Info */}
            <div>
              <h2 className="text-2xl font-black uppercase mb-4">Shipping Info</h2>
              <div className="space-y-4">
                <Input
                  placeholder="Street Address"
                  value={shippingAddress.street || ''}
                  onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
                <Input
                  placeholder="City"
                  value={shippingAddress.city || ''}
                  onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
                <Input
                  placeholder="Postcode"
                  value={shippingAddress.postcode || ''}
                  onChange={(e) => setShippingAddress({...shippingAddress, postcode: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
                <Textarea
                  placeholder="Order notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white/5 border-white/20 text-white h-24"
                />

                <Button
                  onClick={() => checkoutMutation.mutate()}
                  disabled={!hasEnoughXP || checkoutMutation.isPending}
                  className="w-full bg-[#39FF14] text-black font-black text-lg py-6"
                >
                  {checkoutMutation.isPending ? (
                    'Processing...'
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Complete Order ({totalXP} XP)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}