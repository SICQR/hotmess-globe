import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ShoppingBag, Star, Package, Award, Ticket, Shirt, Tag, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OSCard, { OSCardBadge } from '../ui/OSCard';
import LazyImage from '../ui/LazyImage';
import MakeOfferModal from './MakeOfferModal';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const TYPE_ICONS = {
  physical: Package,
  digital: ShoppingBag,
  service: Award,
  ticket: Ticket,
  badge: Award,
  merch: Shirt,
};

const TYPE_COLORS = {
  physical: '#00D9FF',
  digital: '#B026FF',
  service: '#39FF14',
  ticket: '#FFEB3B',
  badge: '#FF6B35',
  merch: '#FF1493',
};

export default function ProductCard({ product, index = 0, onBuy, currentUserXP = 0 }) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const user = await base44.auth.me();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Please log in to add to cart');

      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + 30);

      const existingItems = await base44.entities.CartItem.filter({
        user_email: currentUser.email,
        product_id: product.id
      });

      if (existingItems.length > 0) {
        return await base44.entities.CartItem.update(existingItems[0].id, {
          quantity: existingItems[0].quantity + 1,
          reserved_until: reservedUntil.toISOString()
        });
      } else {
        return await base44.entities.CartItem.create({
          user_email: currentUser.email,
          product_id: product.id,
          quantity: 1,
          reserved_until: reservedUntil.toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Added to cart!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const Icon = TYPE_ICONS[product.product_type] || ShoppingBag;
  const color = TYPE_COLORS[product.product_type] || '#FF1493';
  const isOutOfStock = useMemo(() => 
    product.status === 'sold_out' || (product.inventory_count !== undefined && product.inventory_count <= 0),
    [product.status, product.inventory_count]
  );
  const isLocked = useMemo(() => 
    product.min_xp_level && currentUserXP < product.min_xp_level,
    [product.min_xp_level, currentUserXP]
  );
  const isOfficial = useMemo(() => 
    product.category === 'official' || product.tags?.includes('official'),
    [product.category, product.tags]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
        <OSCard 
          locked={isLocked}
          xpRequired={product.min_xp_level}
        >
          {/* Editorial Product Photography */}
          <div 
            className="h-48 flex items-center justify-center relative"
            style={{ backgroundColor: `${color}20` }}
          >
            {product.image_urls && product.image_urls.length > 0 ? (
              <LazyImage
                src={product.image_urls[0]}
                alt={product.name}
                className={`w-full h-full object-cover ${isLocked || !isOfficial ? 'grayscale' : ''}`}
                containerClassName="w-full h-full"
              />
            ) : (
              <Icon className="w-20 h-20" style={{ color }} />
            )}
            
            {/* Corner Ribbon for 3rd Party */}
            {!isOfficial && (
              <div className="absolute top-3 right-3">
                <OSCardBadge color="#00D9FF">STREET DROP</OSCardBadge>
              </div>
            )}
            
            {isOutOfStock && !isLocked && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <span className="text-white/60 font-bold uppercase tracking-wider">Sold Out</span>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold hover:text-[#FF1493] transition-colors">{product.name}</h3>
              <OSCardBadge color={color}>
                {product.product_type}
              </OSCardBadge>
            </div>

            {product.description && (
              <p className="text-sm text-white/60 mb-3 line-clamp-2">{product.description}</p>
            )}

            {product.average_rating && (
              <div className="flex items-center gap-1 mb-3">
                <Star className="w-4 h-4 fill-[#FFEB3B] text-[#FFEB3B]" />
                <span className="text-sm font-semibold">{product.average_rating.toFixed(1)}</span>
                <span className="text-xs text-white/40">({product.sales_count || 0} sales)</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-2xl font-black" style={{ color }}>
                {product.price_xp.toLocaleString()} XP
                {product.price_gbp && (
                  <span className="text-sm text-white/40 ml-2">+ £{product.price_gbp}</span>
                )}
              </div>
              <div className="flex gap-2">
                {!isOutOfStock && !isLocked && currentUser && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/10"
                    onClick={(e) => {
                      e.preventDefault();
                      addToCartMutation.mutate();
                    }}
                    disabled={addToCartMutation.isPending}
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  className="flex-1 text-black font-bold"
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.preventDefault();
                    onBuy?.(product);
                  }}
                  disabled={isOutOfStock || isLocked}
                >
                  {isLocked ? 'LOCKED' : isOutOfStock ? 'Sold Out' : 'Buy'}
                </Button>
                {!isOutOfStock && !isLocked && currentUser && currentUser.email !== product.seller_email && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#00D9FF] text-[#00D9FF] hover:bg-[#00D9FF] hover:text-black"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowOfferModal(true);
                    }}
                  >
                    <Tag className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </OSCard>
      </Link>
      {currentUser && (
        <MakeOfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          product={product}
          currentUser={currentUser}
        />
      )}
    </motion.div>
  );
}