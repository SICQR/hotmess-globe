import { cn } from '@/lib/utils';
import { usePulse } from '@/contexts/PulseContext';
import { Button } from '@/components/ui/button';
import { ShoppingBag, MessageCircle, Heart } from 'lucide-react';

/**
 * Product Card
 * Displays marketplace item with CTAs
 * 
 * CTAs:
 * - "Buy now" (after gate)
 * - "Message seller"
 */

export function ProductCard({ 
  product, 
  onBuy, 
  onMessage, 
  className 
}) {
  const { spark } = usePulse();
  const images = Array.isArray(product.images) ? product.images : [];
  const primaryImage = images[0]?.url || images[0] || null;

  const handleBuy = () => {
    spark({ productId: product.id });
    onBuy?.(product);
  };

  const handleMessage = () => {
    onMessage?.(product);
  };

  return (
    <div className={cn(
      'group relative rounded-xl overflow-hidden border border-white/10 bg-white/5 transition-all hover:border-white/20',
      className
    )}>
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-white/10 to-black/40 relative overflow-hidden">
        {primaryImage ? (
          <img 
            src={primaryImage}
            alt={product.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="text-white/20" size={48} />
          </div>
        )}

        {/* Category badge */}
        {product.category && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white/80 px-2 py-1 rounded">
              {product.category}
            </span>
          </div>
        )}

        {/* Worn item indicator */}
        {product.is_worn && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FF1493]/80 text-white px-2 py-1 rounded">
              Worn
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-white truncate">
          {product.title}
        </h3>
        
        {product.description && (
          <p className="text-xs text-white/60 truncate mt-1">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-black text-[#00D9FF]">
            £{product.price?.toFixed(2) || '0.00'}
          </span>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleMessage}
            >
              <MessageCircle size={16} />
            </Button>
            <Button
              variant="hot"
              size="sm"
              className="h-8"
              onClick={handleBuy}
            >
              Buy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
