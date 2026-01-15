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
import { schedule, getNextEpisode, generateICS, downloadICS } from '../components/radio/radioUtils';
import { format } from 'date-fns';

const HNHMESS_RELEASE_SLUG = 'hnhmess';
// Shopify product handles are not the same as release slugs.
// This is the canonical Shopify handle for the HNHMESS lube product used by the home CTA.
const HNHMESS_LUBE_SHOPIFY_HANDLE = 'hnh-mess-lube-250ml';
const HNHMESS_RELEASE_AT_FALLBACK = new Date('2026-01-10T00:00:00Z');

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();
  const { serverNow } = useServerNow();

  const nextRadioUp = useMemo(() => {
    const candidates = (schedule?.shows || [])
      .map((show) => {
        const nextEpisode = getNextEpisode(show?.id);
        if (!show || !nextEpisode?.date) return null;
        return { show, nextEpisode };
      })
      .filter(Boolean);

    if (!candidates.length) return null;
    return candidates.sort((a, b) => a.nextEpisode.date - b.nextEpisode.date)[0];
  }, [serverNow]);

  const handleAddNextShowToCalendar = () => {
    if (!nextRadioUp?.show || !nextRadioUp?.nextEpisode) {
      toast.error('No scheduled shows found.');
      return;
    }

    const ics = generateICS(nextRadioUp.show, nextRadioUp.nextEpisode);
    const filename = `${nextRadioUp.show.slug || nextRadioUp.show.id}-${format(nextRadioUp.nextEpisode.date, 'yyyy-MM-dd')}.ics`;
    downloadICS(ics, filename);
    toast.success('Calendar file downloaded.');
  };

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

  const { data: featuredShopify = null } = useQuery({
    queryKey: ['shopify', 'featured', 'home'],
    queryFn: async () => {
      const resp = await fetch('/api/shopify/featured');
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) return null;
      return payload;
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const featuredShopifyProducts = Array.isArray(featuredShopify?.products)
    ? featuredShopify.products
    : [];

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
    const candidates = [HNHMESS_LUBE_SHOPIFY_HANDLE, HNHMESS_RELEASE_SLUG].filter(Boolean);

    const byHandle = shopifyProductsForLube.find((p) => {
      const raw = p?.details?.shopify_handle;
      const h = raw ? String(raw).toLowerCase().trim() : '';
      return h && candidates.includes(h);
    });
    if (byHandle) return byHandle;

    const byTag = shopifyProductsForLube.find((p) => {
      const tags = Array.isArray(p?.tags) ? p.tags.map((t) => String(t).toLowerCase()) : [];
      return candidates.some((c) => tags.includes(c));
    });
    if (byTag) return byTag;

    const byName = shopifyProductsForLube.find((p) => String(p?.name ?? '').toLowerCase().includes('hnh'));
    if (byName) return byName;

    return null;
  }, [shopifyProductsForLube]);

  const lubeStorefrontHandle =
    (lubeProduct?.details?.shopify_handle ? String(lubeProduct.details.shopify_handle).trim() : '') ||
    HNHMESS_LUBE_SHOPIFY_HANDLE;

  const { data: lubeStorefrontProduct = null } = useQuery({
    queryKey: ['shopify-storefront-product', 'home', lubeStorefrontHandle],
    queryFn: async () => {
      const resp = await fetch(`/api/shopify/product?handle=${encodeURIComponent(lubeStorefrontHandle)}`);
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) return null;
      return payload?.product || null;
    },
    enabled: !!lubeStorefrontHandle,
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

  const tonightEvent = useMemo(() => {
    const events = Array.isArray(recentBeacons)
      ? recentBeacons.filter((b) => String(b?.kind || '').toLowerCase() === 'event')
      : [];
    return events[0] || null;
  }, [recentBeacons]);

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
            <Link to="/social">
              <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-8 py-6 text-lg shadow-2xl">
                <Users className="w-5 h-5 mr-2" />
                SOCIAL
              </Button>
            </Link>
            <Link to="/market">
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
                    Buy now
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
                    Buy now
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
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-4">SHOP</p>
            <h2 className="text-6xl md:text-8xl font-black italic mb-6">SHOP THE DROP</h2>
            <p className="text-xl uppercase tracking-wider text-black/60 max-w-2xl">
              Hardwear. Fit. Club armour. Limited runs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredShopifyProducts.length ? (
              featuredShopifyProducts.slice(0, 2).map((p, idx) => {
                const handle = p?.handle ? String(p.handle) : '';
                const imageUrl = p?.featuredImage?.url || p?.images?.nodes?.[0]?.url || '';
                const imageAlt =
                  p?.featuredImage?.altText || p?.images?.nodes?.[0]?.altText || p?.title || 'Shop item';

                return (
                  <motion.div
                    key={p?.id || handle || idx}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link to={handle ? `/market/p/${encodeURIComponent(handle)}` : '/market'}>
                      <div className="group relative aspect-[4/3] overflow-hidden bg-black">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={imageAlt}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-500" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                          <h3 className="text-3xl md:text-5xl font-black italic mb-4 text-white drop-shadow-2xl">
                            {p?.title || 'Shop'}
                          </h3>
                          <p className="text-sm uppercase tracking-widest text-white drop-shadow-lg">Tap to view</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            ) : (
              <div className="border border-black/10 bg-black/5 p-6">
                <p className="text-black/70">Shop is loading or unavailable.</p>
                <Link to="/market">
                  <Button className="mt-4 bg-black text-white font-black uppercase">Open Market</Button>
                </Link>
              </div>
            )}
          </div>
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
              <p className="text-xs uppercase tracking-[0.4em] text-white/80 mb-4">SOCIAL</p>
              <h2 className="text-6xl md:text-8xl font-black italic mb-8 drop-shadow-2xl">RIGHT NOW</h2>
              <p className="text-xl mb-8 leading-relaxed drop-shadow-lg">
                Compatibility-first discovery. No swiping. No ghosts. Just good chemistry backed by real data.
              </p>
              <Link to="/social">
                <Button className="bg-black text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4 text-lg shadow-2xl">
                  DISCOVER
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
              Three moves you can actually make.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-white/5 border-2 border-white/10 p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#00D9FF] text-black flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black uppercase">RSVP</h3>
                </div>

                {tonightEvent ? (
                  <>
                    <p className="text-white/60 uppercase tracking-wider text-xs mb-2">Tonight</p>
                    <p className="text-2xl font-black mb-2">{tonightEvent.title}</p>
                    <p className="text-white/70 text-sm mb-6 line-clamp-2">{tonightEvent.description}</p>
                    <Link to={`/events/${encodeURIComponent(tonightEvent.id)}`}>
                      <Button className="bg-[#00D9FF] hover:bg-white text-black font-black uppercase w-full">
                        RSVP
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-white/70 text-sm mb-6">
                      Find what’s on and lock it in.
                    </p>
                    <Link to="/events">
                      <Button className="bg-[#00D9FF] hover:bg-white text-black font-black uppercase w-full">
                        VIEW EVENTS
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-white/5 border-2 border-white/10 p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-black uppercase">OPEN IN PULSE</h3>
                </div>
                <p className="text-white/70 text-sm mb-6">
                  Map + layers. Find the energy.
                </p>
                <Link to="/pulse">
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase w-full">
                    OPEN PULSE
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white/5 border-2 border-white/10 p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-black uppercase">DISCOVER</h3>
                </div>
                <p className="text-white/70 text-sm mb-6">
                  Right now guys near you.
                </p>
                <Link to="/social">
                  <Button className="bg-white text-black hover:bg-black hover:text-white font-black uppercase w-full">
                    GO RIGHT NOW
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="text-center">
            <Link to="/events">
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
                <h2 className="text-5xl font-black italic drop-shadow-lg">ON AIR</h2>
              </div>
              <p className="text-xl mb-8 leading-relaxed text-white drop-shadow-md">
                Live now on HOTMESS RADIO.
              </p>

              {nextRadioUp?.show && nextRadioUp?.nextEpisode && (
                <p className="text-sm uppercase tracking-wider text-white/70 mb-6 drop-shadow-md">
                  Next up: {nextRadioUp.show.title} • {format(nextRadioUp.nextEpisode.date, 'EEE d MMM')} • {nextRadioUp.nextEpisode.startTime} (London)
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <Link to="/music/live">
                  <Button className="bg-black text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4 shadow-2xl">
                    LISTEN LIVE
                  </Button>
                </Link>
                <Button
                  onClick={handleAddNextShowToCalendar}
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4 shadow-2xl backdrop-blur-sm"
                >
                  ADD NEXT SHOW TO CALENDAR
                </Button>
                <Link to="/music/schedule">
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4 shadow-2xl backdrop-blur-sm">
                    BROWSE SHOWS
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Heart className="w-12 h-12 drop-shadow-lg" />
                <h2 className="text-5xl font-black italic drop-shadow-lg">SAFETY CHECK</h2>
              </div>
              <p className="text-xl mb-8 leading-relaxed text-white drop-shadow-md">
                You good?
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-black text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4 shadow-2xl">
                  ALL GOOD
                </Button>
                <Link to="/safety/resources">
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase shadow-2xl backdrop-blur-sm">
                    NEED A MINUTE
                  </Button>
                </Link>
                <Link to="/safety">
                  <Button className="bg-white text-black hover:bg-black hover:text-white font-black uppercase shadow-2xl">
                    SAFETY
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link to="/pulse">
              <Button
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase shadow-2xl backdrop-blur-sm"
              >
                OPEN PULSE
              </Button>
            </Link>
            <Link to="/calendar">
              <Button
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase shadow-2xl backdrop-blur-sm"
              >
                CALENDAR
              </Button>
            </Link>
            <Link to="/events">
              <Button
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase shadow-2xl backdrop-blur-sm"
              >
                EVENTS
              </Button>
            </Link>
            <Link to="/market">
              <Button
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase shadow-2xl backdrop-blur-sm"
              >
                MARKET
              </Button>
            </Link>
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
                <Link to="/social">
                  <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-8 py-6 text-lg">
                    GO RIGHT NOW
                  </Button>
                </Link>
                <Link to="/pulse">
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    OPEN PULSE
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
            <Link to="/auth">
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