import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GridSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';

export default function Shop() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shopify', 'featured-products'],
    queryFn: async () => {
      const resp = await fetch('/api/shopify/featured');
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const message = payload?.error || 'Failed to load shop';
        throw new Error(message);
      }
      return payload;
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const products = data?.products || [];

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">Shop</h1>
            <p className="text-white/60 uppercase tracking-wider text-sm mt-2">Featured</p>
          </div>
          <Link
            to="/cart"
            className="text-sm font-black uppercase tracking-wider text-[#00D9FF] hover:underline"
          >
            Cart
          </Link>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <GridSkeleton count={2} />
          ) : error ? (
            <div className="border border-white/10 bg-white/5 p-4">
              <p className="text-red-400 font-bold">Failed to load shop</p>
              <p className="text-white/60 text-sm mt-1">{error?.message || 'Unknown error'}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="border border-white/10 bg-white/5 p-4">
              <p className="text-white/70">No products available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <h2 className="mt-4 text-xl font-black uppercase tracking-tight">{p.title}</h2>
                      {p?.variants?.nodes?.[0]?.price?.amount ? (
                        <p className="text-sm text-white/60 mt-2">
                          {Number(p.variants.nodes[0].price.amount).toFixed(2)} {p.variants.nodes[0].price.currencyCode}
                        </p>
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
          )}
        </div>
      </div>
    </div>
  );
}
