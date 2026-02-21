/**
 * LocationShopPanel
 * Slide-up panel that shows Shopify products geo-pinned to a globe location.
 * Appears when a user taps a `locations` spike that has `shopify_handles`.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ExternalLink, Plus, Check } from 'lucide-react';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

async function fetchProduct(handle) {
  const res = await fetch(`/api/shopify/product?handle=${encodeURIComponent(handle)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.product ?? null;
}

export default function LocationShopPanel({ location, onClose }) {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [addedIds, setAddedIds]     = useState(new Set());
  const { addLines }                = useShopCart();
  const navigate                    = useNavigate();

  const handles = Array.isArray(location?.shopify_handles) ? location.shopify_handles : [];

  const handlelesStr = handles.join(',');
  useEffect(() => {
    if (!handles.length) { setLoading(false); return; }

    Promise.all(handles.map(fetchProduct))
      .then((results) => setProducts(results.filter(Boolean)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [handlelesStr]); // eslint-disable-line react-hooks/exhaustive-deps -- join is stable for same array content

  const handleAddToCart = async (product) => {
    const variantId = product?.variants?.[0]?.id;
    if (!variantId) return;
    try {
      await addLines([{ merchandiseId: variantId, quantity: 1 }]);
      setAddedIds((prev) => new Set([...prev, product.id]));
      setTimeout(() => setAddedIds((prev) => { const n = new Set(prev); n.delete(product.id); return n; }), 2000);
    } catch {
      // silently fail — cart error handled by ShopCartContext
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="location-shop-panel"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0,      opacity: 1 }}
        exit={{    y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[80] max-h-[70vh] flex flex-col bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl overflow-hidden"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FF1493]" />
            <div>
              <p className="text-sm font-black text-white uppercase tracking-wide">
                {location?.title || 'Shop This Location'}
              </p>
              <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                {handles.length} {handles.length === 1 ? 'item' : 'items'} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" />
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-10">
              <p className="text-white/30 text-sm">No products found for this location.</p>
            </div>
          )}

          {!loading && products.map((product) => {
            const price     = product?.variants?.[0]?.price?.amount;
            const currency  = product?.variants?.[0]?.price?.currencyCode ?? 'GBP';
            const image     = product?.images?.[0]?.url;
            const isAdded   = addedIds.has(product.id);

            return (
              <div
                key={product.id}
                className="flex gap-3 bg-white/5 border border-white/10 rounded-xl p-3"
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  {image
                    ? <img src={image} alt={product.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white/20"><ShoppingBag className="w-6 h-6" /></div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{product.title}</p>
                  {price && (
                    <p className="text-xs text-[#FF1493] font-black mt-0.5">
                      {new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(price))}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all active:scale-95"
                      style={{
                        background: isAdded ? '#39FF14' : '#FF1493',
                        color: '#000',
                        boxShadow: isAdded ? '0 0 12px rgba(57,255,20,0.4)' : '0 0 12px rgba(255,20,147,0.4)',
                      }}
                    >
                      {isAdded ? <><Check className="w-3 h-3" /> Added</> : <><Plus className="w-3 h-3" /> Add</>}
                    </button>
                    <button
                      onClick={() => navigate(`/market/p/${product.handle}`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50 border border-white/10 hover:bg-white/5 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        {!loading && products.length > 0 && (
          <div className="px-4 pb-6 pt-3 border-t border-white/10">
            <button
              onClick={() => { navigate(createPageUrl('ShopCart')); onClose(); }}
              className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              View Cart
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
