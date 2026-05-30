import { supabase } from '@/components/utils/supabaseClient';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Play, ShoppingBag, Shield, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import SoundCloudEmbed from '@/components/media/SoundCloudEmbed';
import { useServerNow } from '@/hooks/use-server-now';
import { addToCart } from '@/components/marketplace/cartStorage';

const RELEASE_SLUG = 'hnhmess';
const FALLBACK_RELEASE_AT = new Date('2026-01-10T00:00:00Z');
const HNHMESS_SOUNDCLOUD_URL = 'https://soundcloud.com/rawconvictrecords/hnh-mess/s-jK7AWO2CQ6t';

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
        const { data: { user } } = await supabase.auth.getUser();
      if (!user) { user = null; } else { const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(); user = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email }; };
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
      const rows = await supabase.from('beacons').select('*').eq(
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
      const metadata = await supabase.from('audio_metadata').select('*').order('-created_date', { ascending: false }).limit(50);
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
      const rows = await supabase.from('products').select('*').eq(
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

  const PRODUCT_IMG =
    'https://cdn.shopify.com/s/files/1/0898/3245/6517/files/upload_vfKIW_gxRluGoOwPLITLrg.png';

  return (
    <div className="min-h-screen bg-[#050507] text-white pb-24">

      {/* ── 1. MEANING — why this exists ─────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-12 px-6">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(200,150,44,0.08) 0%, transparent 60%)' }} />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#C8962C] mb-6">Hand N Hand</p>
            <h1 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tight mb-6">
              HNH <span className="text-[#C8962C]">MESS</span>
            </h1>
            <p className="text-white/60 text-base md:text-lg leading-relaxed max-w-lg mx-auto mb-4">
              Built by the community, for the community. Body-safe, vegan,
              and designed for connection — not performance.
            </p>
            <p className="text-white/90 font-bold text-sm uppercase tracking-wider">
              Ask first. Confirm yes. Respect no. No pressure.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 2. PRODUCT — what it is ──────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-6 p-6">
              <div className="flex-shrink-0 w-28 h-36 relative">
                <img
                  src={galleryImages[0] || PRODUCT_IMG}
                  alt="HNH MESS lube"
                  className="w-full h-full object-contain drop-shadow-2xl"
                  onError={(e) => { e.target.src = PRODUCT_IMG; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">Premium water-based lube</p>
                <h2 className="text-2xl font-black uppercase mb-3">HNH MESS</h2>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest rounded px-2 py-1" style={{ background: '#C8962C', color: '#000' }}>
                    50ml &middot; &pound;10
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest rounded px-2 py-1 border border-[#C8962C]/40 text-[#C8962C]">
                    250ml &middot; &pound;15
                  </span>
                </div>
                {primaryVariant?.price?.amount && (
                  <p className="text-white/40 text-xs">
                    From {primaryVariant.price.amount} {primaryVariant.price.currencyCode}
                  </p>
                )}
              </div>
            </div>

            {galleryImages.length > 1 && (
              <div className="px-6 pb-4">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        idx === selectedImageIndex ? 'border-white' : 'border-white/20 hover:border-white/50'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SoundCloud embed */}
            {!isPreLaunch && soundcloudRef && (
              <div className="px-6 pb-6">
                <SoundCloudEmbed urlOrUrn={soundcloudRef} />
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── 3. CTAs — shop, listen, safety ───────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <div className="flex flex-col gap-3">
            {product ? (
              <Button
                onClick={() => addToCartMutation.mutate()}
                className="w-full bg-[#C8962C] hover:bg-white text-black font-black uppercase py-6 text-base"
                disabled={addToCartMutation.isPending}
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Add to cart
              </Button>
            ) : (
              <Link to={`/market/p/${RELEASE_SLUG}`} className="block">
                <Button className="w-full bg-[#C8962C] hover:bg-white text-black font-black uppercase py-6 text-base">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Shop HNH MESS
                </Button>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Link to={`/music/releases/${RELEASE_SLUG}`}>
                <Button variant="outline" className="w-full border-2 border-white/20 text-white hover:bg-white/10 font-black uppercase py-4">
                  <Play className="w-4 h-4 mr-2" />
                  {isPreLaunch ? 'Preview' : 'Listen'}
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full border-2 border-white/20 text-white hover:bg-white/10 font-black uppercase py-4"
                onClick={() => navigate('/safety')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Safety
              </Button>
            </div>

            {isPreLaunch && (
              <Button
                variant="ghost"
                onClick={handleNotify}
                className="text-white/50 hover:text-white font-black uppercase text-xs"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notify me at launch
              </Button>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── 4. CARE — aftercare context ──────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 pb-12">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-3">Aftercare</p>
          <p className="text-white/70 text-sm leading-relaxed max-w-md mx-auto">
            Hydrate. Reset. Check in. Land in Safety if you need it.
          </p>
          <Link to="/care" className="inline-block mt-4 text-[#C8962C] text-xs font-black uppercase tracking-wider hover:text-white transition-colors">
            Hand N Hand care resources
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-6 text-center">
        <p className="text-white/20 text-[10px] uppercase tracking-[0.3em]">A HOTMESS original</p>
      </footer>
    </div>
  );
}
