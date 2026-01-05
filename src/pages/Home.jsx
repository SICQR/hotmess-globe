import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44, supabase } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapPin, ShoppingBag, Users, Radio, Heart, Calendar, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServerNow } from '@/hooks/use-server-now';
import { toast } from 'sonner';

const HNHMESS_RELEASE_SLUG = 'hnhmess';
const HNHMESS_RELEASE_AT_FALLBACK = new Date('2026-01-10T00:00:00Z');

const COLLECTIONS = [
  { id: 'raw', name: 'RAW', tagline: 'Hardwear. Clean lines. Loud intent.', color: '#000000' },
  { id: 'hung', name: 'HUNG', tagline: "Fit that doesn't ask permission.", color: '#FF1493' },
  { id: 'high', name: 'HIGH', tagline: 'Club armour. Daylight optional.', color: '#B026FF' },
  { id: 'super', name: 'SUPER', tagline: 'Limited. Unapologetic. Gone fast.', color: '#00D9FF' },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();
  const { serverNow } = useServerNow();

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

  const { data: releaseBeacons = [] } = useQuery({
    queryKey: ['release-beacons'],
    queryFn: async () => {
      const rows = await base44.entities.Beacon.filter(
        { active: true, status: 'published', kind: 'release' },
        'release_at',
        10
      );
      return Array.isArray(rows) ? rows : [];
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('home-release-beacons')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Beacon' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['release-beacons'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const featuredRelease = (() => {
    const now = serverNow ?? new Date();
    const sorted = [...releaseBeacons]
      .filter((b) => b?.release_at)
      .sort((a, b) => new Date(a.release_at) - new Date(b.release_at));

    const upcoming = sorted.find((b) => new Date(b.release_at) > now);
    if (upcoming) return { beacon: upcoming, state: 'upcoming' };

    const live = [...sorted]
      .reverse()
      .find((b) => {
        const start = new Date(b.release_at);
        const end = b.end_at ? new Date(b.end_at) : null;
        return start <= now && (!end || now < end);
      });
    if (live) return { beacon: live, state: 'live' };

    return null;
  })();

  const hnhmessReleaseBeacon = useMemo(() => {
    const normalized = HNHMESS_RELEASE_SLUG;
    return releaseBeacons.find((b) => String(b?.release_slug ?? '').trim() === normalized) || null;
  }, [releaseBeacons]);

  const hnhmessReleaseAt = useMemo(() => {
    if (hnhmessReleaseBeacon?.release_at) return new Date(hnhmessReleaseBeacon.release_at);
    return HNHMESS_RELEASE_AT_FALLBACK;
  }, [hnhmessReleaseBeacon]);

  const hnhmessWindow = useMemo(() => {
    const startAt = new Date(hnhmessReleaseAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endAt = new Date(hnhmessReleaseAt.getTime() + 72 * 60 * 60 * 1000);
    return { startAt, endAt };
  }, [hnhmessReleaseAt]);

  const now = serverNow ?? new Date();
  const isHnhmessWindow = now >= hnhmessWindow.startAt && now < hnhmessWindow.endAt;
  const isHnhmessPreLaunch = now < hnhmessReleaseAt;

  const handleHnhmessNotify = async () => {
    try {
      localStorage.setItem(`notify_release_${HNHMESS_RELEASE_SLUG}`, '1');
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      toast.success('Saved. We’ll ping you while you’re in-app.');
    } catch {
      toast.success('Saved.');
    }
  };

  const { data: recentBeacons = [] } = useQuery({
    queryKey: ['recent-beacons'],
    queryFn: async () => {
      const allBeacons = await base44.entities.Beacon.filter({ active: true, status: 'published' });
      const today = new Date();
      // Filter to only upcoming/current events
      const upcomingBeacons = allBeacons.filter(b => {
        if (b.kind === 'event' && b.event_date) {
          return new Date(b.event_date) >= today;
        }
        return true; // Non-events always show
      });
      // Sort by event date for events, created_date for others
      return upcomingBeacons
        .sort((a, b) => {
          const aDate = a.event_date ? new Date(a.event_date) : new Date(a.created_date);
          const bDate = b.event_date ? new Date(b.event_date) : new Date(b.created_date);
          return aDate - bDate;
        })
        .slice(0, 6);
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }, '-created_date', 3)
  });

  const { data: shopifyProductsForLube = [] } = useQuery({
    queryKey: ['shopify-products', 'for-home-lube'],
    queryFn: async () => {
      const rows = await base44.entities.Product.filter(
        { status: 'active', seller_email: 'shopify@hotmess.london' },
        '-created_date',
        100
      );
      return Array.isArray(rows) ? rows : [];
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const lubeProduct = useMemo(() => {
    const handle = HNHMESS_RELEASE_SLUG;
    const byHandle = shopifyProductsForLube.find(
      (p) => String(p?.details?.shopify_handle ?? '').toLowerCase() === handle
    );
    if (byHandle) return byHandle;

    const byTag = shopifyProductsForLube.find(
      (p) => Array.isArray(p?.tags) && p.tags.map((t) => String(t).toLowerCase()).includes(handle)
    );
    if (byTag) return byTag;

    const byName = shopifyProductsForLube.find((p) => String(p?.name ?? '').toLowerCase().includes('hnh'));
    if (byName) return byName;

    return null;
  }, [shopifyProductsForLube]);

  const { data: lubeStorefrontProduct = null } = useQuery({
    queryKey: ['shopify-storefront-product', 'home', HNHMESS_RELEASE_SLUG],
    queryFn: async () => {
      const resp = await fetch(`/api/shopify/product?handle=${encodeURIComponent(HNHMESS_RELEASE_SLUG)}`);
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) return null;
      return payload?.product || null;
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const lubeImageUrl =
    lubeProduct?.image_urls?.[0] ||
    lubeStorefrontProduct?.featuredImage?.url ||
    lubeStorefrontProduct?.images?.nodes?.[0]?.url ||
    '';
  const lubeImageAlt =
    lubeStorefrontProduct?.featuredImage?.altText ||
    lubeStorefrontProduct?.images?.nodes?.[0]?.altText ||
    lubeProduct?.name ||
    'HNH MESS lube';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HERO */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/hung-hero.png"
            alt="HUNG Hero"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1920&q=80';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center px-6 max-w-6xl"
        >
          <h1 className="text-[20vw] md:text-[12vw] font-black italic leading-[0.8] tracking-tighter mb-8 drop-shadow-2xl">
            HOT<span className="text-[#FF1493]">MESS</span>
          </h1>
          <p className="text-2xl md:text-4xl font-bold uppercase tracking-wider mb-4 drop-shadow-lg">
            LONDON OS
          </p>
          <p className="text-base md:text-xl text-white/90 uppercase tracking-widest mb-12 max-w-3xl mx-auto drop-shadow-lg">
            RAW / HUNG / HIGH / SUPER + HNH MESS. No filler. No shame.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to={createPageUrl('Connect')}>
              <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-8 py-6 text-lg shadow-2xl">
                <Users className="w-5 h-5 mr-2" />
                CONNECT NOW
              </Button>
            </Link>
            <Link to={createPageUrl('Marketplace')}>
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg shadow-2xl backdrop-blur-sm">
                <ShoppingBag className="w-5 h-5 mr-2" />
                SHOP THE DROP
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* LUBE CTA (always visible) */}
      <section className="py-16 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center bg-white/5 border-2 border-white/10 p-6 md:p-10">
            <div className="relative aspect-[4/3] overflow-hidden">
              {lubeImageUrl ? (
                <img
                  src={lubeImageUrl}
                  alt={lubeImageAlt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-black" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/70">Shop</p>
                <p className="text-2xl font-black uppercase">HNH MESS LUBE</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-3">For sale</p>
              <h2 className="text-4xl md:text-5xl font-black italic mb-4">Lube + aftercare energy.</h2>
              <p className="text-white/70 uppercase tracking-wider mb-8">
                Smooth. Clean. Built for the night.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/hnhmess">
                  <Button className="bg-[#B026FF] hover:bg-white text-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    Shop lube
                  </Button>
                </Link>
                {isHnhmessPreLaunch ? (
                  <Button
                    onClick={handleHnhmessNotify}
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg"
                  >
                    Notify me
                  </Button>
                ) : (
                  <Link to={`/music/releases/${HNHMESS_RELEASE_SLUG}`}>
                    <Button
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg"
                    >
                      Listen now
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LAUNCH STRIP (HNHMESS window) */}
      {isHnhmessWindow && (
        <section className="py-10 px-6 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/5 border-2 border-white/10 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">Launch</p>
                <p className="text-xl font-black uppercase">
                  {isHnhmessPreLaunch ? 'Midnight drop: HNHMESS + Vol1' : 'Out now: HNHMESS + Vol1'}
                </p>
                {isHnhmessPreLaunch && (
                  <p className="text-white/60 uppercase tracking-wider text-sm">
                    {formatCountdown(hnhmessReleaseAt)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={`/music/releases/${HNHMESS_RELEASE_SLUG}`}>
                  <Button className="bg-[#B026FF] hover:bg-white text-white hover:text-black font-black uppercase">
                    {isHnhmessPreLaunch ? 'Open release' : 'Play'}
                  </Button>
                </Link>
                <Link to="/hnhmess">
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase">
                    Buy HNH MESS lube
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RELEASE COUNTDOWN */}
      {featuredRelease?.beacon?.release_slug && featuredRelease?.beacon?.release_at && (
        <section className="py-16 px-6 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/5 border-2 border-white/10 p-8">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-4">DROP</p>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black italic mb-2">
                    {featuredRelease.beacon.release_title || featuredRelease.beacon.title || 'RELEASE'}
                  </h2>
                  <p className="text-white/70 uppercase tracking-wider">
                    {featuredRelease.state === 'upcoming' ? 'Launches in' : 'Live now'}
                  </p>
                  <p className="text-white/50 uppercase tracking-wider text-sm">
                    {formatLondonDateTime(featuredRelease.beacon.release_at)} (London)
                  </p>
                </div>
                <div className="text-right">
                  {featuredRelease.state === 'upcoming' ? (
                    <div className="text-3xl md:text-5xl font-mono font-black text-[#B026FF]">
                      {formatCountdown(new Date(featuredRelease.beacon.release_at))}
                    </div>
                  ) : (
                    <div className="text-3xl md:text-5xl font-black text-[#B026FF]">LIVE</div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <Link to={`/music/releases/${encodeURIComponent(featuredRelease.beacon.release_slug)}`}>
                  <Button className="bg-[#B026FF] hover:bg-white text-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    OPEN RELEASE
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SHOP COLLECTIONS */}
      <section className="py-32 px-6 bg-white text-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-4">COLLECTIONS</p>
            <h2 className="text-6xl md:text-8xl font-black italic mb-6">SHOP THE DROP</h2>
            <p className="text-xl uppercase tracking-wider text-black/60 max-w-2xl">
              Hardwear. Fit. Club armour. Limited runs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Link to={createPageUrl('Marketplace')}>
                <div className="group relative aspect-[4/3] overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1483118714900-540cf339fd46?w=800&q=90" 
                    alt="RAW Collection"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-500" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <h3 className="text-6xl font-black italic mb-4 text-white drop-shadow-2xl">RAW</h3>
                    <p className="text-sm uppercase tracking-widest text-white drop-shadow-lg">Hardwear. Clean lines. Loud intent.</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Link to={createPageUrl('Marketplace')}>
                <div className="group relative aspect-[4/3] overflow-hidden">
                  <img 
                    src="/images/hung-hero.png"
                    alt="HUNG Collection"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1529068755536-a5ade0dcb4e8?w=800&q=90';
                    }}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF1493]/50 to-black/60 group-hover:from-[#FF1493]/30 transition-all duration-500" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <h3 className="text-6xl font-black italic mb-4 text-white drop-shadow-2xl">HUNG</h3>
                    <p className="text-sm uppercase tracking-widest text-white drop-shadow-lg">Fit that doesn't ask permission.</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Link to={createPageUrl('Marketplace')}>
                <div className="group relative aspect-[4/3] overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=90" 
                    alt="HIGH Collection"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#B026FF]/50 to-black/60 group-hover:from-[#B026FF]/30 transition-all duration-500" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <h3 className="text-6xl font-black italic mb-4 text-white drop-shadow-2xl">HIGH</h3>
                    <p className="text-sm uppercase tracking-widest text-white drop-shadow-lg">Club armour. Daylight optional.</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Link to={createPageUrl('Marketplace')}>
                <div className="group relative aspect-[4/3] overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=90" 
                    alt="SUPER Collection"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00D9FF]/50 to-black/60 group-hover:from-[#00D9FF]/30 transition-all duration-500" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <h3 className="text-6xl font-black italic mb-4 text-white drop-shadow-2xl">SUPER</h3>
                    <p className="text-sm uppercase tracking-widest text-white drop-shadow-lg">Limited. Unapologetic. Gone fast.</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>

          {products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {products.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group"
                >
                  <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
                    <div className="aspect-square bg-black mb-4 overflow-hidden">
                      {product.image_urls?.[0] && (
                        <img src={product.image_urls[0]} alt={product.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      )}
                    </div>
                    <h3 className="font-black uppercase text-lg mb-2">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[#FF1493] font-bold">{product.price_xp} XP</span>
                      <span className="text-black/40">•</span>
                      <span className="text-black/60">£{product.price_gbp}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HUNGMESS EDITORIAL */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img
            src="/images/hungmess-editorial.png"
            alt="HUNGMESS editorial"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1529068755536-a5ade0dcb4e8?w=1920&q=80';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black" />
        </div>
        <div className="relative z-10 text-center px-6 max-w-6xl">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60 mb-4">Editorial</p>
          <h2 className="text-[18vw] md:text-[10vw] font-black italic leading-[0.8] tracking-tighter text-white drop-shadow-2xl">
            HUNGMESS
          </h2>
        </div>
      </section>

      {/* CONNECT */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1920&q=80" 
            alt="Connect"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/90 to-[#FF1493]/70" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/80 mb-4">DISCOVERY</p>
              <h2 className="text-6xl md:text-8xl font-black italic mb-8 drop-shadow-2xl">FIND YOUR TRIBE</h2>
              <p className="text-xl mb-8 leading-relaxed drop-shadow-lg">
                Compatibility-first discovery. No swiping. No ghosts. Just good chemistry backed by real data.
              </p>
              <Link to={createPageUrl('Connect')}>
                <Button className="bg-black text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4 text-lg shadow-2xl">
                  START CONNECTING
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 gap-6"
            >
              <div className="bg-black/40 backdrop-blur-md p-6 border-2 border-white/30 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black uppercase">RIGHT NOW</h3>
                </div>
                <p className="text-white/90 text-sm uppercase tracking-wide">
                  30min–Tonight. Can host / Travel / Hotel. Real time, real intent.
                </p>
              </div>
              <div className="bg-black/40 backdrop-blur-md p-6 border-2 border-white/30 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black uppercase">BROWSE</h3>
                </div>
                <p className="text-white/90 text-sm uppercase tracking-wide">
                  Explore profiles. Filter by vibes, tribes, boundaries. Your pace.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BEACONS */}
      <section className="py-32 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/40 mb-4">EVENTS</p>
            <h2 className="text-6xl md:text-8xl font-black italic mb-6 text-white">
              TONIGHT<span className="text-[#00D9FF]">.</span>
            </h2>
            <p className="text-xl uppercase tracking-wider text-white/60 max-w-2xl">
              Live beacon network. Real-time intensity. Verified check-ins.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {recentBeacons.length > 0 ? (
              recentBeacons.map((beacon, idx) => (
                <motion.div
                 key={beacon.id}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: idx * 0.1 }}
                >
                 <Link to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                   <div className="group relative aspect-[4/3] overflow-hidden bg-white/5">
                     {beacon.image_url ? (
                       <img 
                         src={beacon.image_url} 
                         alt={beacon.title}
                         className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                       />
                     ) : (
                       <img 
                         src="https://images.unsplash.com/photo-1571266028243-d220ee4cb5cd?w=600&q=80" 
                         alt={beacon.title}
                         className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                       />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                     <div className="absolute bottom-0 left-0 right-0 p-6">
                       <div className="flex items-start justify-between mb-3">
                         <div className="px-2 py-1 bg-[#00D9FF] text-black text-xs font-black uppercase">
                           {beacon.kind}
                         </div>
                         <MapPin className="w-4 h-4 text-white" />
                       </div>
                       <h3 className="font-black text-xl mb-2 text-white drop-shadow-lg">{beacon.title}</h3>
                       <p className="text-sm text-white/80 mb-3 line-clamp-2 drop-shadow-md">{beacon.description}</p>
                       <div className="flex items-center gap-2 text-xs text-white/70">
                         <Calendar className="w-3 h-3" />
                         <span className="uppercase">{beacon.city}</span>
                       </div>
                     </div>
                   </div>
                 </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-white/40">
                <p className="text-lg uppercase">No upcoming events</p>
              </div>
            )}
          </div>

          <div className="text-center">
            <Link to={createPageUrl('Events')}>
              <Button className="bg-[#00D9FF] hover:bg-white text-black font-black uppercase px-8 py-4 text-lg shadow-2xl">
                VIEW ALL EVENTS
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* RADIO + CARE */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=1920&q=80" 
            alt="Radio"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#B026FF]/85 to-black/70" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Radio className="w-12 h-12 drop-shadow-lg" />
                <h2 className="text-5xl font-black italic drop-shadow-lg">RADIO</h2>
              </div>
              <p className="text-xl mb-8 leading-relaxed text-white drop-shadow-md">
                24/7 stream. London OS soundtrack. No ads. Just frequency.
              </p>
              <Link to={createPageUrl('Radio')}>
                <Button className="bg-black text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4 shadow-2xl">
                  LISTEN NOW
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Heart className="w-12 h-12 drop-shadow-lg" />
                <h2 className="text-5xl font-black italic drop-shadow-lg">CARE</h2>
              </div>
              <p className="text-xl mb-8 leading-relaxed text-white drop-shadow-md">
                Aftercare checklists. Emergency contacts. Community resources. Because preparation isn't paranoia.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#B026FF] font-black uppercase shadow-2xl backdrop-blur-sm">
                  LEARN MORE
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 bg-black text-white text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-6xl md:text-9xl font-black italic mb-8">
            JOIN<span className="text-[#FF1493]">.</span>
          </h2>
          <p className="text-2xl uppercase tracking-wider text-white/60 mb-12">
            London OS. No ghost status. Right now ends automatically.
          </p>
          {currentUser ? (
            <div className="space-y-4">
              <p className="text-xl text-[#39FF14]">Welcome back, {currentUser.full_name}</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to={createPageUrl('Connect')}>
                  <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-8 py-6 text-lg">
                    GO RIGHT NOW
                  </Button>
                </Link>
                <Link to={createPageUrl('Globe')}>
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    VIEW GLOBE
                  </Button>
                </Link>
                {currentUser.role !== 'admin' && (
                  <Link to={createPageUrl('PromoteToAdmin')}>
                    <Button variant="outline" className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase px-8 py-6 text-lg">
                      BECOME ADMIN
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <Link to={createPageUrl('Onboarding')}>
              <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-12 py-8 text-2xl">
                GET STARTED
              </Button>
            </Link>
          )}
        </motion.div>
      </section>
    </div>
  );
}