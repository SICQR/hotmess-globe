import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchCollectionByHandle } from '@/features/shop/api/shopifyStorefront';
import { GridSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';

const moneyRange = (range) => {
  const min = Number(range?.minVariantPrice?.amount);
  const max = Number(range?.maxVariantPrice?.amount);
  const currency = range?.minVariantPrice?.currencyCode || range?.maxVariantPrice?.currencyCode;

  if (!Number.isFinite(min) || !currency) return null;

  try {
    const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency });
    if (Number.isFinite(max) && max !== min) return `${fmt.format(min)} – ${fmt.format(max)}`;
    return fmt.format(min);
  } catch {
    return `${min}`;
  }
};

export default function ShopCollection() {
  const { handle, collection: collectionParam } = useParams();
  const resolvedHandle = handle || collectionParam;

  const { data, isLoading, error } = useQuery({
    queryKey: ['shopify', 'collection', resolvedHandle],
    queryFn: () => fetchCollectionByHandle({ handle: resolvedHandle, firstProducts: 48 }),
    enabled: !!resolvedHandle,
  });

  const collectionData = data?.collection || null;
  const notConfigured = !!data?.notConfigured;
  const products = collectionData?.products?.nodes || [];

  return (
    <div className="min-h-screen bg-black text-white">
      <PageShell
        eyebrow="MARKET"
        title={collectionData?.title || 'Collection'}
        subtitle={collectionData?.description || 'Browse the drop.'}
        maxWidth="6xl"
        back="/market"
        backLabel="Back to market"
        right={
          <Button asChild variant="glass" className="border-white/20">
            <Link to="/cart">Cart</Link>
          </Button>
        }
      >
        {isLoading ? (
          <GridSkeleton count={12} />
        ) : notConfigured ? (
          <div className="border border-white/10 bg-white/5 p-4">
            <p className="text-white font-bold">Shop temporarily unavailable</p>
            <p className="text-white/60 text-sm mt-1">
              Shopify Storefront isn’t configured for this deployment yet.
            </p>
            {data?.details ? (
              <p className="text-white/50 text-xs mt-2">{data.details}</p>
            ) : null}
          </div>
        ) : error ? (
          <div className="border border-white/10 bg-white/5 p-4">
            <p className="text-red-400 font-bold">Failed to load collection</p>
            <p className="text-white/60 text-sm mt-1">{error?.message || 'Unknown error'}</p>
          </div>
        ) : !collectionData ? (
          <div className="border border-white/10 bg-white/5 p-4">
            <p className="text-white/70">Collection not found.</p>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const href = `/market/p/${encodeURIComponent(p.handle)}`;
              const primaryUrl = p?.featuredImage?.url || p?.images?.nodes?.[0]?.url || '';
              const primaryAlt = p?.featuredImage?.altText || p?.images?.nodes?.[0]?.altText || p?.title;
              const secondaryUrl = p?.images?.nodes?.[1]?.url || '';
              const secondaryAlt = p?.images?.nodes?.[1]?.altText || primaryAlt;
              return (
                <div
                  key={p.id}
                  className="border-2 border-white/10 bg-white/5 p-5"
                >
                  <Link
                    to={href}
                    className="block hover:opacity-95 transition-opacity"
                  >
                    <div className="group aspect-square bg-black border border-white/10 overflow-hidden relative">
                      {primaryUrl ? (
                        <img
                          src={primaryUrl}
                          alt={primaryAlt || p.title}
                          loading="lazy"
                          decoding="async"
                          className={
                            "absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 " +
                            (secondaryUrl ? "opacity-100 group-hover:opacity-0" : "opacity-100")
                          }
                        />
                      ) : null}

                      {secondaryUrl ? (
                        <img
                          src={secondaryUrl}
                          alt={secondaryAlt || p.title}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />
                      ) : null}
                    </div>
                    <h2 className="mt-4 text-lg font-black uppercase tracking-tight">{p.title}</h2>
                    <p className="text-sm text-white/60 mt-2">{moneyRange(p.priceRange) || '—'}</p>
                    {p.totalInventory === 0 ? (
                      <p className="text-xs mt-2 text-[#C8962C] font-bold uppercase tracking-wider">Sold out</p>
                    ) : null}
                  </Link>

                  <div className="mt-4">
                    <Button
                      asChild
                      variant="cyan"
                      className="w-full font-black uppercase"
                    >
                      <Link to={href}>View product</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
}
