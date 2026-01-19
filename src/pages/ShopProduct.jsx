import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchProductByHandle } from '@/features/shop/api/shopifyStorefront';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import PageShell from '@/components/shell/PageShell';

const money = (price) => {
  const amount = Number(price?.amount);
  const currency = price?.currencyCode || 'GBP';
  if (!Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export default function ShopProduct() {
  const { handle } = useParams();
  const { addItem } = useShopCart();

  const { data, isLoading, error } = useQuery({
    queryKey: ['shopify', 'product', handle],
    queryFn: () => fetchProductByHandle({ handle }),
    enabled: !!handle,
  });

  const product = data?.product || null;
  const notConfigured = !!data?.notConfigured;
  const variants = product?.variants?.nodes || [];

  const imageCandidates = useMemo(() => {
    const out = [];

    const push = (url, altText) => {
      const cleanUrl = String(url || '').trim();
      if (!cleanUrl) return;
      if (out.some((img) => img.url === cleanUrl)) return;
      out.push({ url: cleanUrl, altText: String(altText || '').trim() || null });
    };

    push(product?.featuredImage?.url, product?.featuredImage?.altText || product?.title);

    const nodes = product?.images?.nodes;
    if (Array.isArray(nodes)) {
      for (const node of nodes) {
        push(node?.url, node?.altText || product?.title);
      }
    }

    return out;
  }, [product?.featuredImage?.url, product?.featuredImage?.altText, product?.images?.nodes, product?.title]);

  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  useEffect(() => {
    if (!imageCandidates.length) {
      setSelectedImageUrl(null);
      return;
    }
    setSelectedImageUrl((current) => {
      if (current && imageCandidates.some((img) => img.url === current)) return current;
      return imageCandidates[0].url;
    });
  }, [imageCandidates]);

  const selectedImage = useMemo(() => {
    if (!selectedImageUrl) return null;
    return imageCandidates.find((img) => img.url === selectedImageUrl) || null;
  }, [imageCandidates, selectedImageUrl]);

  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const selectedVariant = useMemo(
    () => variants.find((v) => v?.id === selectedVariantId) || null,
    [variants, selectedVariantId]
  );

  const anyAvailable = useMemo(
    () => variants.some((v) => !!v?.availableForSale),
    [variants]
  );

  useEffect(() => {
    if (!handle) return;
    if (!variants.length) return;

    setSelectedVariantId((current) => {
      const currentVariant = current ? variants.find((v) => v?.id === current) : null;
      if (currentVariant?.availableForSale) return current;

      const firstAvailable = variants.find((v) => v?.availableForSale)?.id;
      return firstAvailable || variants[0]?.id || null;
    });
  }, [handle, variants]);

  const canBuy = !!selectedVariant?.availableForSale;

  const onAddToCart = async () => {
    if (!selectedVariantId || !canBuy) return;
    try {
      await addItem({ variantId: selectedVariantId, quantity: 1 });
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err?.message || 'Failed to add to cart');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <PageShell
        eyebrow="MARKET"
        title={product?.title || (isLoading ? 'Loading…' : 'Product')}
        subtitle={selectedVariant?.price ? `From ${money(selectedVariant.price)}` : 'Drop details + variants.'}
        maxWidth="5xl"
        back
        backLabel="Back"
        right={
          <Button asChild variant="glass" className="border-white/20">
            <Link to="/cart">Cart</Link>
          </Button>
        }
      >
        {isLoading ? (
          <div className="border border-white/10 bg-white/5 p-6">Loading…</div>
        ) : notConfigured ? (
          <div className="border border-white/10 bg-white/5 p-6">
            <p className="text-white font-bold">Shop temporarily unavailable</p>
            <p className="text-white/60 text-sm mt-1">
              Shopify Storefront isn’t configured for this deployment yet.
            </p>
            {data?.details ? (
              <p className="text-white/50 text-xs mt-2">{data.details}</p>
            ) : null}
          </div>
        ) : error ? (
          <div className="border border-white/10 bg-white/5 p-6">
            <p className="text-red-400 font-bold">Failed to load product</p>
            <p className="text-white/60 text-sm mt-1">{error?.message || 'Unknown error'}</p>
          </div>
        ) : !product ? (
          <div className="border border-white/10 bg-white/5 p-6">Product not found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-white/10 bg-white/5">
              <div className="aspect-square bg-black border-b border-white/10 overflow-hidden">
                {selectedImage?.url ? (
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.altText || product.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center"
                  />
                ) : null}
              </div>

              {imageCandidates.length > 1 ? (
                <div className="p-4 border-b border-white/10">
                  <div className="grid grid-cols-6 gap-2">
                    {imageCandidates.slice(0, 12).map((img) => {
                      const isActive = img.url === selectedImageUrl;
                      return (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => setSelectedImageUrl(img.url)}
                          className={
                            "aspect-square overflow-hidden border bg-black focus:outline-none focus:ring-2 focus:ring-[#00D9FF] " +
                            (isActive ? "border-[#00D9FF]" : "border-white/10 hover:border-white/30")
                          }
                          aria-label="View product image"
                        >
                          <img
                            src={img.url}
                            alt={img.altText || product.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover object-center"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="p-4 text-xs text-white/60">
                <p>18+ • Consent-first • Care always.</p>
              </div>
            </div>

            <div>
              {selectedVariant?.price ? (
                <p className="text-xl font-black text-[#FFEB3B]">{money(selectedVariant.price)}</p>
              ) : null}

              <div className="mt-6 space-y-4">
                {variants.length > 1 ? (
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Variant</p>
                    <Select value={selectedVariantId || ''} onValueChange={setSelectedVariantId}>
                      <SelectTrigger className="mt-2 bg-black border-white/20">
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent className="bg-black text-white border-white/20">
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id} disabled={!v?.availableForSale}>
                            {v.title}{v.availableForSale ? '' : ' (Sold out)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {!anyAvailable ? (
                  <div className="border border-white/10 bg-white/5 p-4">
                    <p className="text-[#FF1493] font-bold uppercase tracking-wider text-sm">Sold out</p>
                    <p className="text-white/60 text-sm mt-1">This item is currently sold out.</p>
                  </div>
                ) : !canBuy ? (
                  <div className="border border-white/10 bg-white/5 p-4">
                    <p className="text-[#FF1493] font-bold uppercase tracking-wider text-sm">Sold out</p>
                    <p className="text-white/60 text-sm mt-1">This variant is sold out. Choose another.</p>
                  </div>
                ) : null}

                <Button
                  onClick={onAddToCart}
                  disabled={!canBuy}
                  variant="cyan"
                  size="xl"
                  className="w-full font-black uppercase"
                >
                  {canBuy ? 'Add to cart' : 'Sold out'}
                </Button>

                {product?.descriptionHtml ? (
                  <div className="mt-6 border-t border-white/10 pt-6">
                    <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-2">Details</p>
                    <div
                      className="prose prose-invert max-w-none prose-a:text-[#00D9FF]"
                      dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                    />
                  </div>
                ) : null}

                <div className="mt-6">
                  <Link to="/legal/privacy" className="text-xs text-white/50 hover:text-white">
                    Privacy
                  </Link>
                  <span className="mx-2 text-white/20">•</span>
                  <Link to="/legal/terms" className="text-xs text-white/50 hover:text-white">
                    Terms
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}
