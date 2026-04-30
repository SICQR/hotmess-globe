/**
 * L2ShopSheet — Professional Shopify Product Detail & Browser
 * 
 * Refined UI: Stacked Image Gallery (no swiping), Multi-Variant Selection.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, ShoppingCart, Loader2,
  ChevronRight, ChevronDown, Tag, Share2, MessageCircle, HandCoins,
  Truck, RotateCcw, Flag, Info, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetSection, SheetActions, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { fetchProductByHandle } from '@/features/shop/api/shopifyStorefront';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import ProductReviews from '@/components/marketplace/ProductReviews';
import { nudgeAfterLatePurchase } from '@/lib/careNudges';
import { getInternalProducts } from '@/lib/data/market';

/**
 * Universal Data Resolvers
 */
const getProductPrice = (p) => {
  if (!p) return 0;
  if (p.priceRange?.minVariantPrice) return parseFloat(p.priceRange.minVariantPrice.amount);
  return parseFloat(p.price || 0);
};

const getProductImages = (p) => {
  if (!p) return [];
  // Priority 1: cover_image_url (Preloved schema)
  if (p.cover_image_url) return [p.cover_image_url];
  // Priority 2: images array (Legacy/Internal schema)
  if (Array.isArray(p.images) && p.images.length > 0) return p.images;
  // Priority 3: Shopify structure
  const nodes = p.images?.nodes || [];
  const feat = p.featuredImage?.url;
  const all = [feat, ...nodes.map(n => n?.url)].filter(Boolean);
  return Array.from(new Set(all));
};

/**
 * Image Gallery — Stacked for clarity (User request: simpler, no swiping)
 */
function ImageGallery({ images = [], alt = 'Product' }) {
  if (!images?.length) return (
    <div className="aspect-square max-h-[300px] w-full bg-[#0A0A0B] flex items-center justify-center mx-auto rounded-2xl border border-white/5">
      <ShoppingBag className="w-12 h-12 text-white/5" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-[600px] mx-auto px-4 mt-6">
      {/* Primary Image */}
      <div className="aspect-[1/1] rounded-2xl overflow-hidden bg-black border border-white/5">
        <img src={images[0]} alt={alt} className="w-full h-full object-contain" />
      </div>
      
      {/* Secondary Grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-3">
          {images.slice(1).map((url, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-black border border-white/5">
              <img src={url} alt={`${alt} ${i+2}`} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Expandable Details
 */
function DetailAccordion({ title, icon: Icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left active:opacity-60 transition-opacity">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-[#C8962C]" />
          <span className="text-[11px] font-black text-white/70 uppercase tracking-[0.15em]">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/20 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pb-4 text-white/50 text-[12px] leading-relaxed font-medium">
                    {children}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Main Content Component
 */
export default function L2ShopSheet({ handle, product: initialPropProduct, seller, source }) {
  const { openSheet, updateSheetProps } = useSheet();
  const { cart, addItem } = useShopCart();
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  
  // Track multiple selections (e.g. { Size: 'M', Color: 'Black' })
  const [selections, setSelections] = useState({});

  // Queries
  const { data: shopData } = useQuery({
    queryKey: ['shopify', 'featured-products'],
    queryFn: async () => {
      const [r, i] = await Promise.all([fetch('/api/shopify/featured'), getInternalProducts({ source: 'shopify' })]);
      const { products = [] } = await r.json().catch(() => ({}));
      return { products: [...i, ...products] };
    }
  });

  const { data: handleProd } = useQuery({
    queryKey: ['shopify', 'product', handle],
    queryFn: async () => {
        const d = await fetchProductByHandle({ handle });
        return d?.product || d;
    },
    enabled: !!handle
  });

  const products = shopData?.products || [];
  const handleMatch = useMemo(() => {
    if (handleProd) return handleProd;
    if (!handle) return null;
    return products.find(p => (p.metadata?.handle === handle || p.handle === handle));
  }, [handleProd, handle, products]);

  const activeProduct = selectedProduct || initialPropProduct || handleMatch;

  const handleBack = useCallback(() => {
    setSelectedProduct(null);
    setSelections({});
    updateSheetProps({ title: 'Shop' });
  }, [updateSheetProps]);

  // Layout Renders
  if (activeProduct) {
    const isInternal = activeProduct.id?.startsWith('internal_');
    const isPreloved = source === 'preloved' || activeProduct.seller_id;
    const images = getProductImages(activeProduct);
    const price = getProductPrice(activeProduct);

    // Shopify Multi-Variant Logic
    const options = activeProduct.options || [];
    const rawVariants = activeProduct.variants?.nodes ?? activeProduct.variants ?? [];
    const variants = Array.isArray(rawVariants) ? rawVariants : [];

    // Find current variant based on ALL current selections
    const selectedVariant = variants.find(v => {
      return options.every(opt => {
        const val = selections[opt.name];
        return v.selectedOptions?.find(so => so.name === opt.name)?.value === val;
      });
    }) || variants[0];

    const allOptionsSelected = options.every(opt => selections[opt.name]);

    const handleMessageSeller = () => {
      if (!activeProduct.seller_id) return;
      openSheet('chat', { recipientId: activeProduct.seller_id });
    };

    const handleBuyNow = () => {
      openSheet('checkout', { id: activeProduct.id, total: price });
    };

    const onAdd = async () => {
      if (addedSuccess) { openSheet('cart'); return; }
      if (!allOptionsSelected && options.length > 0) {
        toast.error('Please select all options');
        return;
      }
      
      setAddingToCart(true);
      try {
        if (isPreloved) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) { toast.error('Login to purchase'); return; }
            await supabase.from('cart_items').insert({ auth_user_id: session.user.id, product_id: activeProduct.id, quantity: 1, source: 'preloved', metadata: { title: activeProduct.title, price, image: images[0] } });
        } else {
            const vid = selectedVariant?.id || import.meta.env.VITE_SHOPIFY_LUBE_VARIANT_ID;
            await addItem({ variantId: vid, quantity: 1 });
        }
        setAddedSuccess(true);
        setTimeout(() => setAddedSuccess(false), 5000);
      } catch(e) { toast.error(e.message); } finally { setAddingToCart(false); }
    };

    return (
      <div className="h-full flex flex-col bg-[#050507]">
        {/* Navigation Overlay */}
        <div className="absolute top-4 left-4 right-4 z-[100] flex items-center justify-between pointer-events-none">
           <button onClick={handleBack} className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform pointer-events-auto border border-white/5">
             <ChevronRight className="rotate-180 w-5 h-5" />
           </button>
           <button onClick={() => openSheet('cart')} className="w-9 h-9 rounded-full bg-black/80 backdrop-blur-md flex items-center justify-center text-[#C8962C] border border-white/10 active:scale-90 transition-transform relative pointer-events-auto shadow-xl">
             <ShoppingBag className="w-4 h-4" />
             {cart?.totalQuantity > 0 && (
               <span className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center bg-white text-black text-[9px] font-black rounded-full px-1 border border-[#C8962C] shadow-lg">{cart.totalQuantity}</span>
             )}
           </button>
        </div>

        <div className="pb-32">
            <ImageGallery images={images} alt={activeProduct.title} />
            
            <div className="max-w-[600px] mx-auto px-6 pt-10 pb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-[12px] font-black uppercase tracking-[0.3em] text-[#C8962C]">
                        {activeProduct.vendor || (isInternal ? 'HNH MESS' : 'HOTMESS')}
                    </span>
                    {activeProduct.metadata?.ageVerifiedOnly && (
                        <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[9px] font-black rounded-lg uppercase border border-red-500/20">18+ Restricted</span>
                    )}
                </div>
                
                <h1 className="text-4xl font-black text-white uppercase tracking-tight leading-[1.0] mb-4">
                    {activeProduct.title}
                </h1>
                
                <div className="flex items-baseline justify-center gap-3 mb-10">
                    <span className="text-3xl font-black text-white">£{price.toFixed(2)}</span>
                    {activeProduct.compareAtPrice && (
                        <span className="text-white/20 text-xl line-through decoration-[#C8962C]/40">£{activeProduct.compareAtPrice.toFixed(2)}</span>
                    )}
                </div>

                {/* SIZES / COLORS */}
                {options.length > 0 && (
                  <div className="space-y-8 mb-12 text-left bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                    {options.map((opt) => (
                      <div key={opt.name}>
                        <div className="flex items-center justify-between mb-4 px-1">
                          <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">{opt.name}</span>
                          {opt.name.toLowerCase() === 'size' && (
                            <button className="text-[10px] font-black text-[#C8962C] transition-opacity hover:opacity-70 uppercase border-b border-[#C8962C]/20">Sizing Help</button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2.5">
                          {opt.values.map(val => {
                            const isSel = selections[opt.name] === val;
                            return (
                              <button
                                key={val}
                                onClick={() => setSelections(prev => ({ ...prev, [opt.name]: val }))}
                                className={`h-11 flex items-center justify-center rounded-xl text-[12px] font-black border transition-all duration-300 ${
                                  isSel 
                                  ? 'bg-[#C8962C] border-[#C8962C] text-black shadow-xl shadow-amber-900/10' 
                                  : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* DESC */}
                <div className="mb-12 text-left">
                    <h4 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 px-1">Story</h4>
                    <div className="text-white/60 text-[15px] leading-relaxed font-medium px-1" dangerouslySetInnerHTML={{ __html: activeProduct.descriptionHtml || activeProduct.description }} />
                </div>

                <div className="space-y-2 mb-10 text-left">
                    <DetailAccordion title="Shipping & Returns" icon={Truck}>
                        <p>Global shipping available. Standard delivery 3-5 days. Free returns on the Legend Drop series within 14 days.</p>
                    </DetailAccordion>
                    <DetailAccordion title="Care Instructions" icon={ShieldCheck}>
                        <p>Machine wash cold. Do not bleach. Tumble dry low for maximum longevity of the high-density print.</p>
                    </DetailAccordion>
                </div>
            </div>
        </div>

        {/* Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 bg-gradient-to-t from-black via-black/98 to-transparent border-t border-white/5">
          <div className="max-w-[500px] mx-auto flex gap-3">
            {isPreloved ? (
              <>
                <Button
                  onClick={handleMessageSeller}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] border-white/10 text-white/70 hover:bg-white/5"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Message
                </Button>
                <Button
                  onClick={handleBuyNow}
                  className="flex-[1.5] h-14 rounded-2xl font-black text-[12px] uppercase tracking-[0.15em] hm-gold-gradient text-black shadow-2xl shadow-amber-900/30"
                >
                  Buy Now
                </Button>
              </>
            ) : (
              <Button
                  disabled={addingToCart}
                  onClick={onAdd}
                  className={`w-full h-16 rounded-2xl font-black text-[14px] uppercase tracking-[0.25em] transition-all active:scale-[0.97] ${
                      addedSuccess ? 'bg-green-600' : 'hm-gold-gradient text-black shadow-2xl shadow-amber-900/30'
                  }`}
              >
                  {addingToCart ? <Loader2 className="animate-spin" /> : addedSuccess ? 'Added ✓ View Bag' : 'Add to Bag'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SHOP LIST VIEW
  return (
    <div className="bg-[#050507] pb-32">
        <div className="px-6 pt-10 pb-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-[12px] font-black text-white/50 uppercase tracking-[0.4em]">Legend Drop: Series 01</h2>
            <button onClick={() => openSheet('cart')} className="flex items-center gap-2 text-[#C8962C] text-[11px] font-black uppercase tracking-wider transition-opacity hover:opacity-70 group">
                <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                BAG ({cart?.totalQuantity || 0})
            </button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/[0.04] mt-px">
            {products.map((p, i) => {
                const img = getProductImages(p)[0];
                const price = getProductPrice(p);
                return (
                    <motion.button
                        key={p.id || i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => { setSelectedProduct(p); updateSheetProps({ title: p.title }); }}
                        className="bg-black p-6 flex flex-col text-left group active:bg-white/[0.02] transition-colors"
                    >
                        <div className="aspect-[4/5] bg-white/[0.03] overflow-hidden rounded-2xl mb-6 shadow-2xl">
                            <img src={img} alt={p.title} className="w-full h-full object-cover grayscale-[0.1] group-hover:grayscale-0 group-hover:scale-110 transition-all [transition-duration:1500ms]" />
                        </div>
                        <div className="mt-auto">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 truncate">{p.vendor || 'HOTMESS'}</p>
                            <h3 className="text-[14px] font-bold text-white/95 line-clamp-1 uppercase tracking-tight mb-2">{p.title}</h3>
                            <p className="text-[16px] font-black text-[#C8962C]">£{price.toFixed(2)}</p>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    </div>
  );
}
