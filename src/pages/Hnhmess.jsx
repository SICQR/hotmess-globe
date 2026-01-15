import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Play, ShoppingBag, Shield } from 'lucide-react';

import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';

const RELEASE_SLUG = 'hnhmess';
const HNHMESS_PRODUCT_HANDLES = ['hnh-mess-lube-50ml', 'hnh-mess-lube-250ml'];
const FALLBACK_RELEASE_AT = new Date('2026-01-10T00:00:00Z');
const HNHMESS_SOUNDCLOUD_URL = 'https://soundcloud.com/rawconvictrecords/hnh-mess/s-jK7AWO2CQ6t';
const HNHMESS_SOUNDCLOUD_EMBED_HTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%3Atracks%3A2243204375%3Fsecret_token%3Ds-jK7AWO2CQ6t&color=%23a35624&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe><div style="font-size: 10px; color: #cccccc;line-break: anywhere;word-break: normal;overflow: hidden;white-space: nowrap;text-overflow: ellipsis; font-family: Interstate,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Garuda,Verdana,Tahoma,sans-serif;font-weight: 100;"><a href="https://soundcloud.com/rawconvictrecords" title="Raw Convict Records" target="_blank" style="color: #cccccc; text-decoration: none;">Raw Convict Records</a> · <a href="https://soundcloud.com/rawconvictrecords/hnh-mess/s-jK7AWO2CQ6t" title="HNH MESS" target="_blank" style="color: #cccccc; text-decoration: none;">HNH MESS</a></div>`;

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function Hnhmess() {
  const navigate = useNavigate();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const formatLondonDateTime = (value) => {
    try {
      return new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/London' });
    } catch {
      return '';
    }
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

  // Post-launch: keep the page in a simple LIVE state.
  const isPreLaunch = false;

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

  const { data: storefrontProducts = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['shopify-storefront-products', ...HNHMESS_PRODUCT_HANDLES],
    queryFn: async () => {
      const responses = await Promise.all(
        HNHMESS_PRODUCT_HANDLES.map(async (handle) => {
          const resp = await fetch(`/api/shopify/product?handle=${encodeURIComponent(handle)}`);
          const payload = await resp.json().catch(() => null);
          if (!resp.ok) return null;
          return payload?.product || null;
        })
      );

      const normalizedOrder = new Map(
        HNHMESS_PRODUCT_HANDLES.map((handle, idx) => [String(handle).trim().toLowerCase(), idx])
      );

      return responses
        .filter(Boolean)
        .sort(
          (a, b) =>
            (normalizedOrder.get(String(a?.handle || '').toLowerCase()) ?? 999) -
            (normalizedOrder.get(String(b?.handle || '').toLowerCase()) ?? 999)
        );
    },
    refetchInterval: 10 * 60 * 1000,
  });

  // Keep these for compatibility with existing layout bits below (release card).
  const primaryStorefrontProduct = storefrontProducts?.[0] || null;
  const primaryVariant =
    (Array.isArray(primaryStorefrontProduct?.variants?.nodes)
      ? primaryStorefrontProduct.variants.nodes.find((v) => v?.availableForSale)
      : null) ||
    (Array.isArray(primaryStorefrontProduct?.variants?.nodes) ? primaryStorefrontProduct.variants.nodes[0] : null) ||
    null;

  const money = useCallback((amount, currency) => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return null;
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'GBP' }).format(n);
    } catch {
      return `${n.toFixed(2)} ${currency || ''}`.trim();
    }
  }, []);

  const onViewProduct = useCallback((handle) => {
    const h = String(handle || '').trim();
    if (!h) return;
    navigate(`/market/p/${encodeURIComponent(h)}`);
  }, [navigate]);

  const galleryImages = useMemo(() => {
    const storefrontImages = Array.isArray(primaryStorefrontProduct?.images?.nodes)
      ? primaryStorefrontProduct.images.nodes
          .map((img) => String(img?.url || '').trim())
          .filter(Boolean)
      : [];
    if (storefrontImages.length) return storefrontImages;

    const featured = String(primaryStorefrontProduct?.featuredImage?.url || '').trim();
    return featured ? [featured] : [];
  }, [primaryStorefrontProduct]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [primaryStorefrontProduct?.id]);

  const isLoadingProduct = isLoadingProducts;

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
                <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                  <Play className="w-5 h-5 mr-2" />
                  Listen now
                </Button>
              </Link>

              <a href="#buy">
                <Button className="bg-white hover:bg-white/90 text-black font-black uppercase px-8 py-6 text-lg">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Shop
                </Button>
              </a>
            </div>

            <div id="buy" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {(isLoadingProduct || !storefrontProducts?.length) && (
                <div className="md:col-span-2 border-2 border-white/10 bg-white/5 p-6">
                  <p className="text-white/70">Loading product…</p>
                </div>
              )}

              {storefrontProducts?.length ? (
                storefrontProducts.map((p) => {
                  const variants = Array.isArray(p?.variants?.nodes) ? p.variants.nodes : [];
                  const v = variants.find((item) => item?.availableForSale) || variants[0] || null;

                  const price = v?.price?.amount ? money(v.price.amount, v.price.currencyCode) : null;
                  const canBuy = !!v?.availableForSale;
                      const handle = String(p?.handle || '').trim();

                  return (
                    <div key={p?.id || p?.handle} className="bg-white/5 border-2 border-white/10 p-6">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-3">Product</p>
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <p className="text-2xl font-black uppercase">{p?.title || 'HNH MESS'}</p>
                          <p className="text-white/60 uppercase tracking-wider text-sm">
                            {v?.title && String(v.title).toLowerCase() !== 'default title'
                              ? String(v.title)
                              : 'Size'}
                          </p>
                        </div>
                        <div className="text-right">
                          {price ? (
                            <p className="text-2xl font-black text-[#00D9FF]">{price}</p>
                          ) : (
                            <p className="text-white/60">—</p>
                          )}
                        </div>
                      </div>

                      {p?.descriptionHtml ? (
                        <div className="mt-4 text-white/70 text-sm prose prose-invert max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />
                        </div>
                      ) : null}

                      {!canBuy ? (
                        <div className="mt-4 border border-white/10 bg-black/40 p-4">
                          <p className="text-[#FF1493] font-bold uppercase tracking-wider text-sm">Sold out</p>
                          <p className="text-white/60 text-sm mt-1">This size is currently sold out.</p>
                        </div>
                      ) : null}

                      <Button
                        onClick={() => onViewProduct(handle)}
                        disabled={!handle}
                        className="mt-6 w-full bg-[#00D9FF] text-black hover:bg-white font-black uppercase py-6"
                      >
                        View product
                      </Button>
                    </div>
                  );
                })
              ) : !isLoadingProduct ? (
                <div className="md:col-span-2 border-2 border-white/10 bg-white/5 p-6">
                  <p className="text-white/70">No products found.</p>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border-2 border-white/10 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-3">Release</p>

                {galleryImages.length > 0 && (
                  <div className="mb-5">
                    <div className="aspect-square rounded-xl overflow-hidden border-2 border-white/10">
                      <img
                        src={galleryImages[Math.min(selectedImageIndex, galleryImages.length - 1)]}
                        alt={primaryStorefrontProduct?.title || 'HNH MESS lube'}
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
                        LIVE
                      </div>
                    ) : (
                      <div className="text-2xl md:text-3xl font-black text-[#B026FF]">LIVE</div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  {isPreLaunch ? (
                    <p className="text-white/60 text-sm">Live now.</p>
                  ) : soundcloudRef ? (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: HNHMESS_SOUNDCLOUD_EMBED_HTML }} />
                    </>
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
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
