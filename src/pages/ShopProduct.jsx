import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchProductByHandle } from '@/features/shop/api/shopifyStorefront';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const { addItem } = useShopCart();

  const { data, isLoading, error } = useQuery({
    queryKey: ['shopify', 'product', handle],
    queryFn: () => fetchProductByHandle({ handle }),
    enabled: !!handle,
  });

  const product = data?.product || null;
  const variants = product?.variants?.nodes || [];

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
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="text-sm text-white/60 hover:text-white">
            ← Back
          </button>
          <Link to="/cart" className="text-sm font-black uppercase tracking-wider text-[#00D9FF] hover:underline">
            Cart
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-8 border border-white/10 bg-white/5 p-6">Loading…</div>
        ) : error ? (
          <div className="mt-8 border border-white/10 bg-white/5 p-6">
            <p className="text-red-400 font-bold">Failed to load product</p>
            <p className="text-white/60 text-sm mt-1">{error?.message || 'Unknown error'}</p>
          </div>
        ) : !product ? (
          <div className="mt-8 border border-white/10 bg-white/5 p-6">Product not found.</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-white/10 bg-white/5">
              <div className="aspect-square bg-black border-b border-white/10 overflow-hidden">
                {product?.featuredImage?.url ? (
                  <img
                    src={product.featuredImage.url}
                    alt={product.featuredImage.altText || product.title}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-4 text-xs text-white/60">
                <p>18+ • Consent-first • Care always.</p>
              </div>
            </div>

            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">{product.title}</h1>
              {selectedVariant?.price ? (
                <p className="mt-2 text-xl font-black text-[#FFEB3B]">{money(selectedVariant.price)}</p>
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
                  className="w-full bg-[#00D9FF] text-black hover:bg-white font-black uppercase py-6"
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
      </div>
    </div>
  );
}
