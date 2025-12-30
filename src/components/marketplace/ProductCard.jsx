import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ShoppingBag, Star, Package, Award, Ticket, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

export default function ProductCard({ product, index = 0, onBuy }) {
  const Icon = TYPE_ICONS[product.product_type] || ShoppingBag;
  const color = TYPE_COLORS[product.product_type] || '#FF1493';
  const isOutOfStock = product.status === 'sold_out' || (product.inventory_count !== undefined && product.inventory_count <= 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
    >
      <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
        <div 
          className="h-48 flex items-center justify-center relative"
          style={{ backgroundColor: `${color}20` }}
        >
          {product.image_urls && product.image_urls.length > 0 ? (
            <img 
              src={product.image_urls[0]} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className="w-20 h-20" style={{ color }} />
          )}
          
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <span className="text-white/60 font-bold uppercase tracking-wider">Sold Out</span>
            </div>
          )}
          
          {product.min_xp_level && (
            <Badge className="absolute top-2 right-2 bg-[#FFEB3B] text-black">
              LVL {Math.floor(product.min_xp_level / 1000) + 1}+
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
            <h3 className="text-xl font-bold hover:text-[#FF1493] transition-colors">{product.name}</h3>
          </Link>
          <Badge 
            variant="outline" 
            className="text-xs uppercase tracking-wider"
            style={{ borderColor: color, color }}
          >
            {product.product_type}
          </Badge>
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

        <div className="flex items-center justify-between">
          <div className="text-2xl font-black" style={{ color }}>
            {product.price_xp.toLocaleString()} XP
          </div>
          <Button
            size="sm"
            className="text-black font-bold"
            style={{ backgroundColor: color }}
            onClick={(e) => {
              e.preventDefault();
              onBuy?.(product);
            }}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? 'Sold Out' : 'Buy'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}