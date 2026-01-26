import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { toast } from 'sonner';
import PageShell from '@/components/shell/PageShell';

const money = (amount, currency) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'GBP' }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency || ''}`.trim();
  }
};

export default function ShopCart() {
  const { cart, isLoading, lastError, updateLineQuantity, removeLine, applyDiscountCode } = useShopCart();
  const [code, setCode] = useState('');

  const lines = cart?.lines?.nodes || [];
  const currency = cart?.cost?.totalAmount?.currencyCode || cart?.cost?.subtotalAmount?.currencyCode || 'GBP';

  const subtotal = useMemo(() => money(cart?.cost?.subtotalAmount?.amount, currency), [cart?.cost?.subtotalAmount?.amount, currency]);
  const total = useMemo(() => money(cart?.cost?.totalAmount?.amount, currency), [cart?.cost?.totalAmount?.amount, currency]);

  const onApply = async () => {
    const trimmed = String(code || '').trim();
    if (!trimmed) return;
    try {
      await applyDiscountCode({ code: trimmed });
      toast.success('Discount applied');
    } catch (err) {
      toast.error(err?.message || 'Failed to apply discount');
    }
  };

  // Checkout happens via the branded handoff page.

  return (
    <div className="min-h-screen bg-black text-white">
      <PageShell
        eyebrow="MARKET"
        title="Cart"
        subtitle="Shipping and taxes are calculated at checkout."
        maxWidth="4xl"
        back="/market"
        backLabel="Back to market"
        right={
          <Button asChild variant="glass" className="border-white/20">
            <Link to="/market">Shop</Link>
          </Button>
        }
      >

        {lastError ? (
          <div className="border border-white/10 bg-white/5 p-4">
            <p className="text-red-400 font-bold">Cart error</p>
            <p className="text-white/60 text-sm mt-1">{lastError?.message || 'Unknown error'}</p>
          </div>
        ) : null}

        {lines.length === 0 ? (
          <div className="border border-white/10 bg-white/5 p-6">
            <p className="text-white/70">Your cart is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {lines.map((line) => {
              const variant = line?.merchandise;
              const product = variant?.product;
              const title = product?.title || 'Item';
              const handle = product?.handle;
              const variantTitle = variant?.title && variant.title !== 'Default Title' ? variant.title : null;
              const priceText = money(variant?.price?.amount, variant?.price?.currencyCode || currency);

              return (
                <div key={line.id} className="border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {handle ? (
                        <Link to={`/p/${encodeURIComponent(handle)}`} className="font-black hover:underline">
                          {title}
                        </Link>
                      ) : (
                        <p className="font-black">{title}</p>
                      )}
                      {variantTitle ? <p className="text-xs text-white/60 uppercase tracking-wider">{variantTitle}</p> : null}
                      {priceText ? <p className="text-xs text-white/60 mt-1">{priceText}</p> : null}
                    </div>
                    <button
                      onClick={() => removeLine({ lineId: line.id }).catch(() => {})}
                      className="text-xs text-white/60 hover:text-white"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs text-white/60 uppercase tracking-wider font-bold">Qty</span>
                    <Input
                      type="number"
                      min={0}
                      value={line.quantity || 0}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        updateLineQuantity({ lineId: line.id, quantity: next }).catch(() => {});
                      }}
                      className="w-24 bg-black border-white/20 text-white"
                      disabled={isLoading}
                    />
                    {!variant?.availableForSale ? (
                      <span className="text-xs text-[#FF1493] font-bold uppercase tracking-wider">Sold out</span>
                    ) : null}
                  </div>
                </div>
              );
            })}

            <div className="border border-white/10 bg-white/5 p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Subtotal</span>
                <span className="font-bold">{subtotal || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Estimated total</span>
                <span className="font-black">{total || '—'}</span>
              </div>
              <p className="text-[11px] text-white/50">Shipping and taxes are calculated at checkout.</p>
            </div>

            <div className="border border-white/10 bg-white/5 p-5">
              <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Promo code</p>
              <div className="mt-2 flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code"
                  className="bg-black border-white/20 text-white"
                />
                <Button
                  onClick={onApply}
                  disabled={isLoading || !String(code || '').trim()}
                  variant="hot"
                  className="font-black uppercase"
                >
                  Apply
                </Button>
              </div>
            </div>

            <Button
              disabled={isLoading || lines.length === 0}
              asChild
              variant="cyan"
              size="xl"
              className="w-full font-black uppercase"
            >
              <Link to="/checkout/start">Checkout</Link>
            </Button>
          </div>
        )}

        <div className="mt-10 text-xs text-white/50">
          <Link to="/legal/privacy" className="hover:text-white">Privacy</Link>
          <span className="mx-2 text-white/20">•</span>
          <Link to="/legal/terms" className="hover:text-white">Terms</Link>
        </div>
      </PageShell>
    </div>
  );
}
