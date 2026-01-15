import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchCollectionByHandle } from '@/features/shop/api/shopifyStorefront';
import { GridSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';

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
  const products = collectionData?.products?.nodes || [];

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link to="/market" className="text-sm text-white/60 hover:text-white">
            ← Back to Shop
          </Link>
          <Link to="/cart" className="text-sm font-black uppercase tracking-wider text-[#00D9FF] hover:underline">
            Cart
          </Link>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <GridSkeleton count={12} />
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
            <>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">{collectionData.title}</h1>
              {collectionData.description ? (
                <p className="text-white/60 mt-3 max-w-2xl">{collectionData.description}</p>
              ) : null}

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => {
                  const href = `/market/p/${encodeURIComponent(p.handle)}`;
                  return (
                    <div
                      key={p.id}
                      className="border-2 border-white/10 bg-white/5 p-5"
                    >
                      <Link
                        to={href}
                        className="block hover:opacity-95 transition-opacity"
                      >
                        <div className="aspect-[16/9] bg-black border border-white/10 overflow-hidden">
                          {p?.featuredImage?.url ? (
                            <img
                              src={p.featuredImage.url}
                              alt={p.featuredImage.altText || p.title}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <h2 className="mt-4 text-lg font-black uppercase tracking-tight">{p.title}</h2>
                        <p className="text-sm text-white/60 mt-2">{moneyRange(p.priceRange) || '—'}</p>
                        {p.totalInventory === 0 ? (
                          <p className="text-xs mt-2 text-[#FF1493] font-bold uppercase tracking-wider">Sold out</p>
                        ) : null}
                      </Link>

                      <div className="mt-4">
                        <Button
                          asChild
                          className="w-full bg-[#00D9FF] text-black hover:bg-white font-black uppercase"
                        >
                          <Link to={href}>View product</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
