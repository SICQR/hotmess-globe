import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Play, ShoppingBag, Shield, Bell, Droplets, Heart, Music } from 'lucide-react';

import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import SoundCloudEmbed from '@/components/media/SoundCloudEmbed';
import { useServerNow } from '@/hooks/use-server-now';
import { addToCart } from '@/components/marketplace/cartStorage';
// createPageUrl no longer used

const RELEASE_SLUG = 'hnhmess';
const FALLBACK_RELEASE_AT = new Date('2026-01-10T00:00:00Z');
const HNHMESS_SOUNDCLOUD_URL = 'https://soundcloud.com/rawconvictrecords/hnh-mess/s-jK7AWO2CQ6t';

// Import brand config - used indirectly for product data

// Product copy - aligned with brand positioning
const PRODUCT_COPY = {
  tagline: "The only lube in the world with real aftercare.",
  subtitle: "We dress care as kink, dripping in sweat dancing next to you.",
  mission: "Smashing stigma. Building community.",
  features: [
    { icon: Droplets, text: "Premium water-based, body-safe formula" },
    { icon: Heart, text: "Real aftercare, not just product" },
    { icon: Music, text: "Exclusive track by SMASH DADDYS" },
  ],
  careMessage: "Ask first. Confirm yes. Respect no. No pressure.",
  aftercare: "HNH — Hand N Hand is the only place to land.",
  hnh: "Our core Sunday show. We never glamourise alternative lifestyles, but we are bold and provocative.",
  credits: {
    producer: "SMASH DADDYS",
    label: "RAW CONVICT RECORDS",
  },
};

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function Hnhmess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { serverNow } = useServerNow();

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }
    };
    fetchUser();
  }, []);

  const formatLondonDateTime = (value) => {
    try {
      return new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/London' });
    } catch {
      return '';
    }
  };

  const formatCountdown = (target) => {
    const now = serverNow ?? new Date();
    const diffMs = Math.max(0, target.getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad2 = (n) => String(n).padStart(2, '0');
    if (days > 0) return `${days}d ${pad2(hours)}h ${pad2(minutes)}m`;
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  };

  const { data: releaseBeacon = null } = useQuery({
    queryKey: ['release-beacon', RELEASE_SLUG],
    queryFn: async () => {
      const rows = await base44.entities.Beacon.filter(
        { active: true, status: 'published', kind: 'release', release_slug: RELEASE_SLUG },
        'release_at',
        1
      );
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    },
    refetchInterval: 60000,
  });

  const releaseAt = useMemo(() => {
    const fromBeacon = releaseBeacon?.release_at ? new Date(releaseBeacon.release_at) : null;
    return fromBeacon || FALLBACK_RELEASE_AT;
  }, [releaseBeacon]);

  const now = serverNow ?? new Date();
  const isPreLaunch = now < releaseAt;

  const { data: releases = [] } = useQuery({
    queryKey: ['audio-releases', 'for-hnhmess'],
    queryFn: async () => {
      const metadata = await base44.entities.AudioMetadata.list('-created_date', 50);
      return Array.isArray(metadata) ? metadata : [];
    },
  });

  const release = useMemo(() => {
    const normalizedSlug = RELEASE_SLUG;
    return (
      releases.find((r) => String(r?.slug ?? '').trim() === normalizedSlug) ||
      releases.find((r) => String(r?.id ?? '').trim() === normalizedSlug) ||
      releases.find((r) => slugify(r?.title) === normalizedSlug) ||
      releases.find((r) => slugify(r?.name) === normalizedSlug) ||
      null
    );
  }, [releases]);

  const soundcloudUrn = release?.soundcloud_urn || release?.metadata?.soundcloud_urn;
  const soundcloudUrl = release?.soundcloud_url || release?.metadata?.soundcloud_url;
  const soundcloudRef = soundcloudUrn || soundcloudUrl || HNHMESS_SOUNDCLOUD_URL;

  const { data: shopifyProducts = [] } = useQuery({
    queryKey: ['shopify-products', 'for-hnhmess'],
    queryFn: async () => {
      const rows = await base44.entities.Product.filter(
        { status: 'active', seller_email: 'shopify@hotmess.london' },
        '-created_date',
        100
      );
      return Array.isArray(rows) ? rows : [];
    },
  });

  const product = useMemo(() => {
    const handle = RELEASE_SLUG;
    const byHandle = shopifyProducts.find((p) => String(p?.details?.shopify_handle ?? '').toLowerCase() === handle);
    if (byHandle) return byHandle;

    const byTag = shopifyProducts.find((p) => Array.isArray(p?.tags) && p.tags.map((t) => String(t).toLowerCase()).includes(handle));
    if (byTag) return byTag;

    const byName = shopifyProducts.find((p) => String(p?.name ?? '').toLowerCase().includes('hnh'));
    if (byName) return byName;

    return null;
  }, [shopifyProducts]);

  const { data: storefrontProduct = null } = useQuery({
    queryKey: ['shopify-storefront-product', RELEASE_SLUG],
    queryFn: async () => {
      const resp = await fetch(`/api/shopify/product?handle=${encodeURIComponent(RELEASE_SLUG)}`);
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) return null;
      return payload?.product || null;
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const primaryVariant = storefrontProduct?.variants?.nodes?.[0] || null;

  const galleryImages = useMemo(() => {
    const supabaseImages = Array.isArray(product?.image_urls)
      ? product.image_urls.map((u) => String(u || '').trim()).filter(Boolean)
      : [];
    if (supabaseImages.length) return supabaseImages;

    const storefrontImages = Array.isArray(storefrontProduct?.images?.nodes)
      ? storefrontProduct.images.nodes
          .map((img) => String(img?.url || '').trim())
          .filter(Boolean)
      : [];
    if (storefrontImages.length) return storefrontImages;

    const featured = String(storefrontProduct?.featuredImage?.url || '').trim();
    return featured ? [featured] : [];
  }, [product?.image_urls, storefrontProduct]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id, storefrontProduct?.id]);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!product?.id) throw new Error('Product not available');
      return addToCart({ productId: product.id, quantity: 1, currentUser });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to add to cart');
    },
  });

  const handleNotify = useCallback(async () => {
    try {
      localStorage.setItem(`notify_release_${RELEASE_SLUG}`, '1');
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      toast.success('You’ll get an in-app ping at launch (while you’re here).');
    } catch {
      toast.success('Saved.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HERO SECTION - Full viewport */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#B026FF]/30 via-black to-[#FF1493]/20" />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#B026FF]/20 rounded-full blur-[150px]"
          />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Copy */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.8 }}
            >
              {/* Brand badge */}
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-[#B026FF] text-black text-xs font-black uppercase">
                  RAW CONVICT RECORDS
                </span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 text-white/60 text-xs font-bold uppercase">
                  × HOTMESS
                </span>
              </div>

              {/* Main title */}
              <h1 className="text-7xl md:text-9xl lg:text-[12rem] font-black italic leading-[0.8] tracking-tighter mb-6">
                HNH<span className="text-[#B026FF]">MESS</span>
              </h1>

              {/* Tagline */}
              <p className="text-2xl md:text-3xl font-bold text-white/90 mb-4 max-w-xl">
                {PRODUCT_COPY.tagline}
              </p>
              <p className="text-lg text-white/60 mb-8 max-w-lg">
                {PRODUCT_COPY.subtitle}
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-4 mb-10">
                {PRODUCT_COPY.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-white/70">
                    <feature.icon className="w-4 h-4 text-[#B026FF]" />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 mb-8">
                {product ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCartMutation.mutate()}
                    disabled={addToCartMutation.isPending}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-[#B026FF] blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
                    <div className="relative bg-[#B026FF] text-black font-black py-5 px-10 text-lg uppercase flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5" />
                      {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
                      {primaryVariant?.price?.amount && (
                        <span className="text-black/60">
                          £{primaryVariant.price.amount}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ) : (
                  <Link to={`/market/p/${RELEASE_SLUG}`}>
                    <Button className="bg-[#B026FF] hover:bg-white text-black font-black uppercase px-10 py-6 text-lg">
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      Shop Now
                    </Button>
                  </Link>
                )}

                <Link to={`/music/releases/${RELEASE_SLUG}`}>
                  <Button 
                    variant="outline" 
                    className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {isPreLaunch ? 'Preview Track' : 'Play Track'}
                  </Button>
                </Link>

                {isPreLaunch && (
                  <Button
                    variant="ghost"
                    onClick={handleNotify}
                    className="text-white/50 hover:text-white font-bold uppercase"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Notify Me
                  </Button>
                )}
              </div>

              {/* Countdown or Live badge */}
              {isPreLaunch ? (
                <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3">
                  <span className="text-xs uppercase tracking-wider text-white/50">Drops in</span>
                  <span className="text-2xl font-mono font-black text-[#B026FF]">
                    {formatCountdown(releaseAt)}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-[#39FF14]/20 border border-[#39FF14]/50 px-4 py-2">
                  <div className="w-2 h-2 bg-[#39FF14] rounded-full animate-pulse" />
                  <span className="text-sm font-black text-[#39FF14] uppercase">Available Now</span>
                </div>
              )}
            </motion.div>

            {/* Right - Product image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {galleryImages.length > 0 ? (
                <div className="relative">
                  {/* Main image */}
                  <div className="aspect-square overflow-hidden border-4 border-white/10 bg-black/50">
                    <motion.img
                      key={selectedImageIndex}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={galleryImages[Math.min(selectedImageIndex, galleryImages.length - 1)]}
                      alt="HNH MESS Lube"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Thumbnails */}
                  {galleryImages.length > 1 && (
                    <div className="flex gap-3 mt-4">
                      {galleryImages.map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`w-20 h-20 overflow-hidden border-2 transition-all ${
                            idx === selectedImageIndex
                              ? 'border-[#B026FF] ring-2 ring-[#B026FF]/50'
                              : 'border-white/20 hover:border-white/50'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Floating badge */}
                  <div className="absolute -top-4 -right-4 bg-[#FF1493] text-black px-4 py-2 font-black text-sm uppercase rotate-3">
                    New Drop
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-[#B026FF]/20 to-[#FF1493]/20 border-4 border-white/10 flex items-center justify-center">
                  <Droplets className="w-32 h-32 text-white/20" />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* DETAILS SECTION */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Music Player */}
            <div className="md:col-span-2 bg-white/5 border-2 border-white/10 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Music className="w-6 h-6 text-[#B026FF]" />
                <h2 className="text-2xl font-black uppercase">The Track</h2>
              </div>
              
              {isPreLaunch ? (
                <div className="bg-white/5 border border-white/10 p-8 text-center">
                  <p className="text-white/60 mb-4">Unlocks at drop time</p>
                  <p className="text-3xl font-mono font-black text-[#B026FF]">
                    {formatCountdown(releaseAt)}
                  </p>
                </div>
              ) : soundcloudRef ? (
                <SoundCloudEmbed urlOrUrn={soundcloudRef} />
              ) : (
                <div className="bg-white/5 border border-white/10 p-8 text-center">
                  <p className="text-white/60">Track coming soon</p>
                </div>
              )}

              <p className="text-xs text-white/40 mt-4 uppercase tracking-wider">
                Produced by SMASH DADDYS for RAW CONVICT RECORDS • Exclusive to HNH MESS
              </p>
            </div>

            {/* Care Card */}
            <div className="bg-[#FF1493]/10 border-2 border-[#FF1493]/30 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Heart className="w-6 h-6 text-[#FF1493]" />
                <h2 className="text-2xl font-black uppercase">Care First</h2>
              </div>
              
              <p className="text-lg font-bold text-white mb-4">{PRODUCT_COPY.careMessage}</p>
              <p className="text-white/60 mb-8">{PRODUCT_COPY.aftercare}</p>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/safety')}
                  className="w-full bg-[#FF1493] hover:bg-white text-black font-black uppercase"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Safety Hub
                </Button>
                <Button
                  onClick={() => navigate('/safety/resources')}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 font-bold"
                >
                  Care Resources
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER / COPYRIGHT */}
      <footer className="py-12 px-6 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-2xl font-black italic mb-2">
                HNH<span className="text-[#B026FF]">MESS</span>
              </p>
              <p className="text-xs text-white/40 uppercase tracking-wider">
                A HOTMESS × RAW CONVICT RECORDS collaboration
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs text-white/40">
              <Link to="/legal/terms" className="hover:text-white transition-colors uppercase">Terms</Link>
              <Link to="/legal/privacy" className="hover:text-white transition-colors uppercase">Privacy</Link>
              <Link to="/safety" className="hover:text-white transition-colors uppercase">Safety</Link>
            </div>

            <div className="text-center md:text-right">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                © 2026 HOTMESS LONDON LTD. All rights reserved.
              </p>
              <p className="text-[10px] text-white/20 uppercase tracking-wider">
                HNH MESS™ is a trademark of HOTMESS LONDON LTD.
              </p>
              <p className="text-[10px] text-white/20 uppercase tracking-wider">
                Produced by SMASH DADDYS • ℗ & © RAW CONVICT RECORDS
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[9px] text-white/20 uppercase tracking-widest">
              HOTMESS • Platform • Radio • Records • London
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
