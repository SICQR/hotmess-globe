import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GridSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';
import { openCartDrawer } from '@/utils/cartEvents';

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
    <div className="min-h-screen bg-black text-white">
      <PageShell
        eyebrow="MARKET"
        title="Market"
        subtitle="Featured drops. Limited. Unapologetic. Gone fast."
        maxWidth="6xl"
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              className="border-white/20"
              onClick={() => openCartDrawer('shopify')}
            >
              Cart
            </Button>
            <Button asChild variant="glass" className="border-white/20">
              <Link to="/market/creators">Creators</Link>
            </Button>
          </div>
        }
      >
        <div>
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
        </div>
      </PageShell>
    </div>
  );
}
