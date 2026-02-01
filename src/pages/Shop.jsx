import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, ArrowRight, Sparkles } from 'lucide-react';
import { GridSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { openCartDrawer } from '@/utils/cartEvents';

export default function Shop() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shopify', 'featured-products'],
    queryFn: async () => {
      const resp = await fetch('/api/shopify/featured');
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const maybeError = String(payload?.error || '').toLowerCase();
        if (
          maybeError.includes('shopify storefront api not configured') ||
          maybeError.includes('invalid shopify storefront token')
        ) {
          return { ok: false, notConfigured: true, products: [], ...payload };
        }

        const message = payload?.error || 'Failed to load shop';
        throw new Error(message);
      }
      return payload;
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const products = data?.products || [];
  const notConfigured = !!data?.notConfigured;
  const featuredProduct = products[0];
  const otherProducts = products.slice(1);

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/40 via-black to-orange-950/40" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] border border-yellow-500/10 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] border border-orange-500/10 rounded-full"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20"
        >
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.4em] text-yellow-400 mb-4">
              MESSMARKET
            </p>
            <h1 className="text-[12vw] md:text-[8vw] font-black italic leading-[0.85] tracking-tighter mb-6">
              SHOP<span className="text-yellow-500">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/70 mb-10 max-w-xl">
              Limited drops. Exclusive merch. Fund the culture without extraction.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => openCartDrawer('shopify')}
                className="bg-yellow-500 hover:bg-white text-black font-black uppercase px-8 py-6 text-lg"
              >
                <ShoppingCart className="w-5 h-5 mr-3" />
                VIEW CART
              </Button>
              <Link to="/market/creators">
                <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                  <Sparkles className="w-5 h-5 mr-3" />
                  CREATORS
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. FEATURED PRODUCT */}
      {!isLoading && !notConfigured && !error && featuredProduct && (
        <section className="py-16 px-6 bg-gradient-to-b from-black to-yellow-950/10">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-yellow-400 mb-6">FEATURED DROP</p>
              
              <Link to={`/market/p/${encodeURIComponent(featuredProduct.handle)}`}>
                <div className="group grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white/5 border border-white/10 hover:border-yellow-500/50 rounded-2xl overflow-hidden transition-all">
                  {/* Image */}
                  <div className="relative aspect-square">
                    {featuredProduct.featuredImage?.url ? (
                      <img 
                        src={featuredProduct.featuredImage.url} 
                        alt={featuredProduct.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                        <ShoppingBag className="w-24 h-24 text-yellow-500/30" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 px-4 py-2 bg-yellow-500 text-black text-sm font-black uppercase rounded-full">
                      NEW DROP
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <h2 className="text-4xl md:text-5xl font-black uppercase mb-4 group-hover:text-yellow-400 transition-colors">
                      {featuredProduct.title}
                    </h2>
                    {featuredProduct.description && (
                      <p className="text-white/60 mb-6 line-clamp-3">
                        {featuredProduct.description}
                      </p>
                    )}
                    {featuredProduct.variants?.nodes?.[0]?.price?.amount && (
                      <p className="text-4xl font-black text-yellow-500 mb-8">
                        £{Number(featuredProduct.variants.nodes[0].price.amount).toFixed(0)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-yellow-400 font-black uppercase group-hover:text-white transition-colors">
                      VIEW PRODUCT
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* 3. PRODUCT GRID */}
      <section className="py-16 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <h2 className="text-4xl font-black italic mb-2">ALL PRODUCTS</h2>
            <p className="text-white/50">{products.length} items available</p>
          </motion.div>

          {isLoading ? (
            <GridSkeleton count={4} />
          ) : notConfigured ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-white/5 rounded-2xl border border-white/10"
            >
              <ShoppingBag className="w-20 h-20 mx-auto mb-6 text-yellow-500/30" />
              <h3 className="text-2xl font-black mb-2">SHOP COMING SOON</h3>
              <p className="text-white/60 mb-2">
                Shopify Storefront isn't configured for this deployment yet.
              </p>
              {data?.details && (
                <p className="text-white/40 text-sm">{data.details}</p>
              )}
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-white/5 rounded-2xl border border-red-500/20"
            >
              <ShoppingBag className="w-20 h-20 mx-auto mb-6 text-red-500/30" />
              <h3 className="text-2xl font-black text-red-400 mb-2">FAILED TO LOAD</h3>
              <p className="text-white/60">{error?.message || 'Unknown error'}</p>
            </motion.div>
          ) : otherProducts.length === 0 && !featuredProduct ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-white/5 rounded-2xl border border-white/10"
            >
              <ShoppingBag className="w-20 h-20 mx-auto mb-6 text-yellow-500/30" />
              <h3 className="text-2xl font-black mb-2">NO PRODUCTS YET</h3>
              <p className="text-white/60">Check back soon for drops.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(featuredProduct ? otherProducts : products).map((p, idx) => {
                const href = `/market/p/${encodeURIComponent(p.handle)}`;
                const primaryUrl = p?.featuredImage?.url || p?.images?.nodes?.[0]?.url || '';
                const secondaryUrl = p?.images?.nodes?.[1]?.url || '';
                
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link to={href}>
                      <div className="group bg-white/5 border border-white/10 hover:border-yellow-500/50 rounded-xl overflow-hidden transition-all">
                        {/* Image */}
                        <div className="relative aspect-square overflow-hidden">
                          {primaryUrl ? (
                            <>
                              <img
                                src={primaryUrl}
                                alt={p.title}
                                loading="lazy"
                                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${secondaryUrl ? 'group-hover:opacity-0' : ''}`}
                              />
                              {secondaryUrl && (
                                <img
                                  src={secondaryUrl}
                                  alt={p.title}
                                  loading="lazy"
                                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                />
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10 flex items-center justify-center">
                              <ShoppingBag className="w-16 h-16 text-yellow-500/30" />
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="p-5">
                          <h3 className="text-lg font-black uppercase mb-2 group-hover:text-yellow-400 transition-colors">
                            {p.title}
                          </h3>
                          {p?.variants?.nodes?.[0]?.price?.amount && (
                            <p className="text-2xl font-black text-yellow-500">
                              £{Number(p.variants.nodes[0].price.amount).toFixed(0)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. CTA */}
      <section className="py-20 px-6 bg-gradient-to-b from-black to-yellow-950/20 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-yellow-500" />
            <h2 className="text-3xl md:text-5xl font-black italic mb-6">
              SUPPORT THE PLATFORM
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              Every purchase funds the culture. No extraction. Just community.
            </p>
            <Button
              onClick={() => openCartDrawer('shopify')}
              className="bg-yellow-500 hover:bg-white text-black font-black uppercase px-12 py-6 text-xl"
            >
              <ShoppingCart className="w-6 h-6 mr-3" />
              VIEW CART
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
