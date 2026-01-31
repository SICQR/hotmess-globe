import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ShoppingBag, Star, Package, Award, Ticket, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OSCard, { OSCardBadge } from '../ui/OSCard';
import LazyImage from '../ui/LazyImage';
import { base44 } from '@/api/base44Client';
import { isXpPurchasingEnabled } from '@/lib/featureFlags';

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

export default function ProductCard({ product, index = 0, currentUserXP = 0 }) {
  const xpPurchasingEnabled = isXpPurchasingEnabled();

  const normalizedDetails = useMemo(() => {
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
  }, [product?.details]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const user = await base44.auth.me();
          // Keeping this for potential future badges; purchases are disabled for now.
          void user;
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const Icon = TYPE_ICONS[product.product_type] || ShoppingBag;
  const color = TYPE_COLORS[product.product_type] || '#FF1493';
  const isShopifyProduct = useMemo(() => {
    const sellerEmail = String(product?.seller_email || '').trim().toLowerCase();
    const tags = Array.isArray(product?.tags) ? product.tags : [];

    return (
      sellerEmail === 'shopify@hotmess.london' ||
      !!normalizedDetails?.shopify_variant_id ||
      !!normalizedDetails?.shopify_id ||
      !!normalizedDetails?.shopify_handle ||
      String(product?.category || '').trim().toLowerCase() === 'official' ||
      tags.some((t) => String(t || '').trim().toLowerCase() === 'official')
    );
  }, [normalizedDetails, product?.seller_email, product?.tags, product?.category]);
  const isOutOfStock = useMemo(() => 
    product.status === 'sold_out' || (product.inventory_count !== undefined && product.inventory_count <= 0),
    [product.status, product.inventory_count]
  );
  const isLocked = useMemo(() => 
    !isShopifyProduct && product.min_xp_level && currentUserXP < product.min_xp_level,
    [isShopifyProduct, product.min_xp_level, currentUserXP]
  );
  const isOfficial = useMemo(() => 
    product.seller_email === 'shopify@hotmess.london' || product.category === 'official' || product.tags?.includes('official'),
    [product.seller_email, product.category, product.tags]
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
          xpRequired={isLocked ? product.min_xp_level : null}
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
                <div
                  className="flex-1 text-black font-bold h-9 px-3 flex items-center justify-center rounded-md text-sm transition-colors cursor-pointer"
                  style={{ backgroundColor: color }}
                >
                  View product
                </div>
              </div>
              {!xpPurchasingEnabled ? (
                <p className="text-xs text-white/50 uppercase tracking-wider">
                  XP purchasing coming soon
                </p>
              ) : null}
            </div>
          </div>
        </OSCard>
      </Link>
    </motion.div>
  );
}