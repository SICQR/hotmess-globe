import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';

export default function CartDrawer({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', currentUser?.email],
    queryFn: async () => {
      const items = await base44.entities.CartItem.filter({ user_email: currentUser.email });
      // Filter out expired reservations (30min timeout)
      const now = new Date();
      return items.filter(item => {
        if (!item.reserved_until) return true;
        return new Date(item.reserved_until) > now;
      });
    },
    enabled: !!currentUser
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const removeMutation = useMutation({
    mutationFn: (itemId) => base44.entities.CartItem.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Removed from cart');
    }
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }) => {
      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + 30);
      return base44.entities.CartItem.update(itemId, { 
        quantity,
        reserved_until: reservedUntil.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
    }
  });

  const cartWithProducts = cartItems.map(item => {
    const product = products.find(p => p.id === item.product_id);
    return { ...item, product };
  }).filter(item => item.product);

  const totalXP = cartWithProducts.reduce((sum, item) => 
    sum + (item.product.price_xp * item.quantity), 0
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="bg-black border-l-2 border-white text-white w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-2xl font-black uppercase text-white">
            <ShoppingCart className="w-6 h-6 text-[#39FF14]" />
            Your Cart
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {cartWithProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {cartWithProducts.map(item => (
                  <div key={item.id} className="flex gap-3 p-4 bg-white/5 border border-white/10">
                    {item.product.image_urls?.[0] && (
                      <img 
                        src={item.product.image_urls[0]} 
                        alt={item.product.name}
                        className="w-20 h-20 object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <Link 
                        to={createPageUrl(`ProductDetail?id=${item.product.id}`)}
                        className="font-bold hover:text-[#39FF14] transition-colors"
                        onClick={onClose}
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-[#FFEB3B] font-mono">{item.product.price_xp} XP each</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantityMutation.mutate({ 
                            itemId: item.id, 
                            quantity: Math.max(1, item.quantity - 1) 
                          })}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-bold">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantityMutation.mutate({ 
                            itemId: item.id, 
                            quantity: item.quantity + 1 
                          })}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMutation.mutate(item.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-white/10 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-black uppercase">Total</span>
                  <span className="text-2xl font-black text-[#FFEB3B]">{totalXP} XP</span>
                </div>
                <Link to={createPageUrl('Checkout')} onClick={onClose}>
                  <Button className="w-full bg-[#39FF14] text-black font-black text-lg py-6">
                    Checkout
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}