import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Play, ShoppingBag, Shield, Bell } from 'lucide-react';

import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import SoundCloudEmbed from '@/components/media/SoundCloudEmbed';
import { useServerNow } from '@/hooks/use-server-now';
import { addToCart } from '@/components/marketplace/cartStorage';
import { createPageUrl } from '../utils';

const RELEASE_SLUG = 'hnhmess';
const FALLBACK_RELEASE_AT = new Date('2026-01-10T00:00:00Z');

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
    <div className="min-h-screen bg-black text-white pb-20">
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=1920&q=80"
            alt="HNHMESS"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60 mb-4">RAW CONVICT RECORDS</p>
            <h1 className="text-6xl md:text-9xl font-black italic leading-[0.85] tracking-tighter mb-6">
              HNHMESS
            </h1>
            <p className="text-xl md:text-2xl uppercase tracking-wider text-white/80 max-w-3xl mb-8">
              Lube + aftercare energy. Soundtrack included.
            </p>

            <div className="flex flex-wrap gap-3 items-center mb-10">
              <Link to={`/music/releases/${RELEASE_SLUG}`}>
                <Button className="bg-[#B026FF] hover:bg-white text-black font-black uppercase px-8 py-6 text-lg">
                  <Play className="w-5 h-5 mr-2" />
                  {isPreLaunch ? `Listen (${formatCountdown(releaseAt)})` : 'Listen now'}
                </Button>
              </Link>

              {product ? (
                <Button
                  variant="outline"
                  onClick={() => addToCartMutation.mutate()}
                  className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg"
                  disabled={addToCartMutation.isPending}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Add lube to cart
                </Button>
              ) : (
                <Link to={`/market/p/${RELEASE_SLUG}`}>
                  <Button
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg"
                  >
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Shop HNH MESS lube
                  </Button>
                </Link>
              )}

              {isPreLaunch && (
                <Button
                  variant="ghost"
                  onClick={handleNotify}
                  className="text-white/70 hover:text-white font-black uppercase"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notify me
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border-2 border-white/10 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-3">Release</p>

                {galleryImages.length > 0 && (
                  <div className="mb-5">
                    <div className="aspect-square rounded-xl overflow-hidden border-2 border-white/10">
                      <img
                        src={galleryImages[Math.min(selectedImageIndex, galleryImages.length - 1)]}
                        alt={product?.name || storefrontProduct?.title || 'HNH MESS lube'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {galleryImages.length > 1 && (
                      <div className="flex gap-3 overflow-x-auto pt-3 pb-1">
                        {galleryImages.map((url, idx) => (
                          <button
                            key={`${url}-${idx}`}
                            type="button"
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                              idx === selectedImageIndex
                                ? 'border-white'
                                : 'border-white/20 hover:border-white/50'
                            }`}
                            aria-label={`View image ${idx + 1}`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-end justify-between gap-6">
                  <div>
                    <p className="text-2xl font-black uppercase">HNHMESS</p>
                    <p className="text-white/60 uppercase tracking-wider text-sm">Drops {formatLondonDateTime(releaseAt)} (London)</p>
                    {primaryVariant?.price?.amount && (
                      <p className="text-white/50 uppercase tracking-wider text-xs mt-1">
                        Lube from {primaryVariant.price.amount} {primaryVariant.price.currencyCode}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {isPreLaunch ? (
                      <div className="text-2xl md:text-3xl font-mono font-black text-[#B026FF]">
                        {formatCountdown(releaseAt)}
                      </div>
                    ) : (
                      <div className="text-2xl md:text-3xl font-black text-[#B026FF]">LIVE</div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  {isPreLaunch ? (
                    <p className="text-white/60 text-sm">Player unlocks at T-0.</p>
                  ) : (soundcloudUrn || soundcloudUrl) ? (
                    <SoundCloudEmbed urlOrUrn={soundcloudUrn || soundcloudUrl} />
                  ) : (
                    <p className="text-white/60 text-sm">Track metadata not linked yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border-2 border-white/10 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-3">Care</p>
                <p className="text-white/90 font-bold mb-3">Ask first. Confirm yes. Respect no. No pressure.</p>
                <p className="text-white/70 text-sm mb-6">Hydrate. Reset. Check in. Land in Safety if you need it.</p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase"
                    onClick={() => navigate('/safety')}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Safety
                  </Button>

                  <Button
                    className="bg-[#FF1493] hover:bg-white text-black font-black uppercase"
                    onClick={() => navigate(createPageUrl('Checkout'))}
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
