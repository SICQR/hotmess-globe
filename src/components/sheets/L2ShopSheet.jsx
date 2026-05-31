/**
 * L2ShopSheet — Professional Shopify Product Detail & Browser
 * 
 * Refined UI: Stacked Image Gallery (no swiping), Multi-Variant Selection.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, ShoppingCart, Loader2,
  ChevronRight, ChevronDown, MessageCircle,
  Truck, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSheet } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { fetchProductByHandle } from '@/features/shop/api/shopifyStorefront';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { getInternalProducts } from '@/lib/data/market';

/**
 * Universal Data Resolvers
 */
const getProductPrice = (p) => {
  if (!p) return 0;
  if (p.priceRange?.minVariantPrice) return parseFloat(p.priceRange.minVariantPrice.amount);
  return parseFloat(p.price || 0);
};

// Product image resolver — Phil 2026-05-31, D18 §7 Media Hierarchy.
//
// REVERSAL of PR #394's bottle-first call. That decision solved an earlier
// problem ("people don't understand what they're buying") on a less mature
// product surface. The surface has since evolved (tappable thumbs from #722,
// editorial-rail carousel behaviour, sharpened HOTMESS identity through D15
// and D262, stronger campaign work). The hierarchy is now SEQUENCED:
//
//   1. Campaign / editorial hero  (Zone B primary — desire)
//   2. Clean product shot          (first thumb — validation)
//   3. Detail / macro              (second thumb — premium signals)
//   4. Lifestyle / texture         (third thumb)
//   5. Secondary campaign crop     (optional, fourth thumb)
//
// D18 §7 hard rule: product imagery VALIDATES the purchase; campaign imagery
// CREATES the desire. Lead with desire, validate with utility.
//
// IMPORTANT: the resolver respects whatever order the data gives. Sequencing
// happens upstream — Shopify product admin / cover_image_url. Do NOT add a
// "campaign vs bottle" classifier in code. The truth lives in the data.
// If a HOTMESS-branded product surfaces a utility-first hero, fix it in
// Shopify by reordering images (campaign first), not in this resolver.
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

// Inline SVG placeholder shown when a product image fails to load.
const IMG_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect width="200" height="200" fill="#0A0A0B"/>' +
    '<rect x="70" y="78" width="60" height="44" rx="6" fill="none" stroke="#2a2a2e" stroke-width="3"/>' +
    '<circle cx="100" cy="100" r="9" fill="none" stroke="#2a2a2e" stroke-width="3"/>' +
    '</svg>'
  );

// Swap a broken product image to the placeholder once (avoid infinite onError loops).
const handleImgError = (e) => {
  const el = e.currentTarget;
  if (el.dataset.fallbackApplied) return;
  el.dataset.fallbackApplied = '1';
  el.src = IMG_FALLBACK;
  el.classList.add('opacity-40');
};

/**
 * D18 §7 + #415 — Hero aspect mode resolver.
 *
 * SKU products (lube, apparel, gear) → 'square' (1/1) with object-contain so
 * the bottle / hem isn't cropped.
 * Editorial / poster-led products (beacon promotions, After Midnight, the
 * SUPERHUNG editorial) → 'editorial' (4/5 portrait) with object-cover so the
 * composition fills the slot — that IS the lux feel.
 *
 * Detection priority:
 *   1. Explicit product.metadata.editorial === true wins.
 *   2. Category / productType match: EDITORIAL / POSTER / BEACON / CAMPAIGN.
 *   3. Default 'square' (safe — letterbox-via-contain over wrong-crop).
 *
 * Do NOT introduce a campaign-vs-utility image classifier here — D18 §7
 * rule: media sequencing lives upstream (Shopify product image order).
 */
function getHeroAspectMode(product) {
  if (!product) return 'square';
  if (product?.metadata?.editorial === true) return 'editorial';
  const t = String(product?.category || product?.productType || '').toUpperCase();
  if (/EDITORIAL|POSTER|BEACON|CAMPAIGN/.test(t)) return 'editorial';
  return 'square';
}

/**
 * Image Gallery — D18 Product Sheet Layout Doctrine.
 * Primary image lux-dominant (~70dvh cap), tappable thumbnails swap into
 * primary. No swiping (Phil's standing call: simpler than carousel).
 * Aspect mode ('square' | 'editorial') drives 1/1 vs 4/5 with the
 * appropriate object-fit. Mode comes from getHeroAspectMode(activeProduct).
 */
function ImageGallery({ images = [], alt = 'Product', mode = 'square' }) {
  // Active-index lets thumbnails swap into the primary slot.
  // Phil 2026-05-31: thumbnails were decorative-only; now tappable.
  const [activeIdx, setActiveIdx] = useState(0);

  // Reset to first image whenever the product changes.
  useEffect(() => { setActiveIdx(0); }, [images?.[0]]);

  if (!images?.length) return (
    <div className="aspect-square max-h-[300px] w-full bg-[#0A0A0B] flex items-center justify-center mx-auto rounded-2xl border border-white/5">
      <ShoppingBag className="w-12 h-12 text-white/5" />
    </div>
  );

  const safeIdx = Math.min(activeIdx, images.length - 1);
  const primaryUrl = images[safeIdx];
  // Show every OTHER image as a thumbnail (full set, minus the one in primary).
  const thumbs = images
    .map((url, i) => ({ url, i }))
    .filter(x => x.i !== safeIdx);

  return (
    <div className="space-y-4 max-w-[600px] mx-auto px-4 mt-4">
      {/* Primary Image — D18 Zone B. Lux-dominant.
          Mode drives the aspect: 'square' (1/1) for SKU, 'editorial' (4/5)
          for poster-led products. 70dvh cap holds in both — buy dock stays
          on screen. aspect-ratio transition gives a smooth snap when a
          mixed-aspect thumbnail swaps in. object-cover on editorial because
          the composition is already framed; object-contain on square so a
          bottle / hem isn't cropped. */}
      <div
        className="rounded-2xl overflow-hidden bg-black border border-white/5"
        style={{
          aspectRatio: mode === 'editorial' ? '4 / 5' : '1 / 1',
          maxHeight: '70dvh',
          transition: 'aspect-ratio 250ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        <img
          key={`primary-${safeIdx}`}
          src={primaryUrl}
          alt={alt}
          className={`w-full h-full ${mode === 'editorial' ? 'object-cover' : 'object-contain'}`}
          onError={handleImgError}
        />
      </div>

      {/* Tappable thumbnails — tap to swap into primary slot. */}
      {thumbs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {thumbs.map(({ url, i }) => (
            <button
              key={i}
              type="button"
              aria-label={`Show image ${i + 1}`}
              onClick={() => setActiveIdx(i)}
              className="aspect-square rounded-xl overflow-hidden bg-black border border-white/10 hover:border-white/30 active:scale-95 transition-all"
            >
              <img
                src={url}
                alt={`${alt} ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={handleImgError}
              />
            </button>
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

  // Phil 2026-05-31 D18 follow-up: kill the "PRODUCT" header in the title bar.
  // When the sheet is opened directly with a product (ShopEngine taps a card),
  // the title bar should carry the product NAME, not the literal word "PRODUCT".
  // updateSheetProps drives L2SheetContainer's <h2 id="sheet-title">.
  useEffect(() => {
    if (activeProduct?.title) updateSheetProps({ title: activeProduct.title });
  }, [activeProduct?.title, updateSheetProps]);

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

    // Price reflects the SELECTED variant when available (variant price can be a
    // number or a Shopify { amount } shape), falling back to the product min price.
    const variantPrice = selectedVariant?.price?.amount != null
      ? parseFloat(selectedVariant.price.amount)
      : (typeof selectedVariant?.price === 'number' ? selectedVariant.price : null);
    const price = (variantPrice != null && !Number.isNaN(variantPrice))
      ? variantPrice
      : getProductPrice(activeProduct);

    // Phil 2026-05-29 — only count REAL options for the cart-gate.
    // Shopify's default 'Title: Default Title' placeholder + any single-value
    // option should not block add-to-cart. Same filter as the UI render above.
    const allOptionsSelected = options.every(opt => {
      const name = String(opt.name || '').toLowerCase();
      const values = Array.isArray(opt.values) ? opt.values : [];
      if (name === 'title' && values.length === 1 && String(values[0]).toLowerCase() === 'default title') return true;
      if (values.length <= 1) return true;
      return !!selections[opt.name];
    });

    const handleMessageSeller = () => {
      if (!activeProduct.seller_id) return;
      openSheet('chat', { recipientId: activeProduct.seller_id });
    };

    // Preloved Buy Now (existing behaviour for seller listings).
    const handleBuyNow = () => {
      openSheet('checkout', { id: activeProduct.id, total: price });
    };

    // Shopify "Buy now" — open the checkout sheet directly with just THIS item.
    // Server re-prices at checkout; the price/variantId here are cosmetic/identity only.
    const handleShopifyBuyNow = () => {
      if (!allOptionsSelected && options.length > 0) {
        toast.error('Please select all options');
        return;
      }
      const vid = selectedVariant?.id || import.meta.env.VITE_SHOPIFY_LUBE_VARIANT_ID;
      const item = {
        id: activeProduct.id,
        variantId: vid,
        title: activeProduct.title,
        price,
        qty: 1,
        source: 'shopify',
      };
      openSheet('checkout', { cartItems: [item], total: price });
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
           {/* Back chevron only when navigating grid→product within the sheet.
               When opened directly as ?sheet=product (from a Shop card), the
               drag handle / swipe / backdrop is the dismissal — no redundant back. */}
           {selectedProduct ? (
             <button onClick={handleBack} className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform pointer-events-auto border border-white/5">
               <ChevronRight className="rotate-180 w-5 h-5" />
             </button>
           ) : (
             <div className="w-9 h-9" />
           )}
           <button onClick={() => openSheet('cart')} className="w-9 h-9 rounded-full bg-black/80 backdrop-blur-md flex items-center justify-center text-[#C8962C] border border-white/10 active:scale-90 transition-transform relative pointer-events-auto shadow-xl">
             <ShoppingBag className="w-4 h-4" />
             {cart?.totalQuantity > 0 && (
               <span className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center bg-white text-black text-[9px] font-black rounded-full px-1 border border-[#C8962C] shadow-lg">{cart.totalQuantity}</span>
             )}
           </button>
        </div>

        <div className="pb-32">
            <ImageGallery
              images={images}
              alt={activeProduct.title}
              mode={getHeroAspectMode(activeProduct)}
            />
            
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

                {/* SIZES / COLORS — Phil 2026-05-29 filter out Shopify default placeholder.
                    When a Shopify product has no real variation, its options come back as
                    [{name: 'Title', values: ['Default Title']}]. Rendering a 'Title' selector
                    with one fake choice is dead UI. Also strip any option that has only one
                    value — there's no choice to make. Same logic applies to single-size lubes
                    where each size is its own Shopify product (so the size IS the card,
                    no selector needed). */}
                {(() => {
                  const realOptions = options.filter((opt) => {
                    const name = String(opt.name || '').toLowerCase();
                    const values = Array.isArray(opt.values) ? opt.values : [];
                    // Hide Shopify's default placeholder.
                    if (name === 'title' && values.length === 1 && String(values[0]).toLowerCase() === 'default title') return false;
                    // Hide any option with no choice to make.
                    if (values.length <= 1) return false;
                    return true;
                  });
                  if (realOptions.length === 0) return null;
                  return (
                  <div className="space-y-8 mb-12 text-left bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                    {realOptions.map((opt) => (
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
                  );
                })()}

                {/* DESC */}
                <div className="mb-12 text-left">
                    <h4 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 px-1">Story</h4>
                    <div className="text-white/60 text-[15px] leading-relaxed font-medium px-1" dangerouslySetInnerHTML={{ __html: activeProduct.descriptionHtml || activeProduct.description }} />
                </div>

                <div className="space-y-2 mb-10 text-left">
                    <DetailAccordion title="Shipping & Returns" icon={Truck}>
                        <p>Global shipping available. Standard delivery 3-5 days. Free returns on the Legend Drop series within 14 days.</p>
                    </DetailAccordion>
                    {/* Phil 2026-05-29 — Care Instructions only render for APPAREL.
                        Previously fired for every product including lube, which is
                        absurd (lube does not need machine washing). Sacred Invariant
                        principle: source of truth lives on Shopify. If Shopify
                        provides care metafield for a product, render it; otherwise,
                        only render the apparel-default copy when productType
                        actually indicates apparel. */}
                    {(() => {
                      const t = String(activeProduct.category || activeProduct.productType || '').toUpperCase();
                      const isApparel = /APPAREL|CLOTHING|SHIRT|TEE|HOODIE|CAP|JACKET|SWEAT|HAT|MERCH/.test(t);
                      if (!isApparel) return null;
                      return (
                        <DetailAccordion title="Care Instructions" icon={ShieldCheck}>
                          <p>Machine wash cold. Do not bleach. Tumble dry low for maximum longevity of the high-density print.</p>
                        </DetailAccordion>
                      );
                    })()}
                </div>
            </div>
        </div>

        {/* Action Bar — D18 Zone D. ALWAYS visible. Safe-area aware.
            Gradient backdrop keeps the dock readable over any image. */}
        <div
          className="absolute bottom-0 left-0 right-0 px-6 pt-6 bg-gradient-to-t from-black via-black/95 to-transparent border-t border-white/5"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
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
              <>
                <Button
                    disabled={addingToCart}
                    onClick={onAdd}
                    variant="outline"
                    className={`flex-1 h-16 rounded-2xl font-black text-[12px] uppercase tracking-[0.15em] transition-all active:scale-[0.97] ${
                        addedSuccess ? 'bg-green-600 border-green-600 text-white' : 'border-white/15 text-white/80 hover:bg-white/5'
                    }`}
                >
                    {addingToCart ? <Loader2 className="animate-spin" /> : addedSuccess ? 'Added ✓ View Bag' : 'Add to Bag'}
                </Button>
                <Button
                    disabled={addingToCart}
                    onClick={handleShopifyBuyNow}
                    className="flex-[1.3] h-16 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all active:scale-[0.97] hm-gold-gradient text-black shadow-2xl shadow-amber-900/30"
                >
                    Buy Now
                </Button>
              </>
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
                            <img src={img} alt={p.title} className="w-full h-full object-cover grayscale-[0.1] group-hover:grayscale-0 group-hover:scale-110 transition-all [transition-duration:1500ms]" onError={handleImgError} />
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

