import React, { useMemo, useState } from 'react';
import { ShoppingCart, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const money = (amount, currency) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'GBP' }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency || ''}`.trim();
  }
};

export function ShopCartPanel({ showTitle = true } = {}) {
  const {
    cart,
    isLoading,
    updateLineQuantity,
    removeLine,
    applyDiscountCode,
  } = useShopCart();

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

  return (
    <div className="mt-6 space-y-4">
      {showTitle ? (
        <SheetHeader>
          <SheetTitle className="text-white font-black uppercase tracking-wider">Cart</SheetTitle>
        </SheetHeader>
      ) : null}

      {lines.length === 0 ? (
        <div className="border border-white/10 bg-white/5 p-4">
          <p className="text-white/70 text-sm">Your cart is empty.</p>
          <div className="mt-3">
            <Link to="/market" className="text-[#00D9FF] hover:underline text-sm font-bold">
              Continue shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {lines.map((line) => {
            const variant = line?.merchandise;
            const product = variant?.product;
            const title = product?.title || 'Item';
            const handle = product?.handle;
            const variantTitle = variant?.title && variant.title !== 'Default Title' ? variant.title : null;
            const priceText = money(variant?.price?.amount, variant?.price?.currencyCode || currency);

            return (
              <div key={line.id} className="border border-white/10 bg-white/5 p-3">
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
                    className="p-1 rounded hover:bg-white/10"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4 text-white/70" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white hover:text-black"
                      disabled={isLoading || (line.quantity || 0) <= 1}
                      onClick={() => updateLineQuantity({ lineId: line.id, quantity: (line.quantity || 0) - 1 }).catch(() => {})}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-bold w-8 text-center">{line.quantity || 0}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white hover:text-black"
                      disabled={isLoading}
                      onClick={() => updateLineQuantity({ lineId: line.id, quantity: (line.quantity || 0) + 1 }).catch(() => {})}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Subtotal</span>
          <span className="font-bold">{subtotal || '—'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Estimated total</span>
          <span className="font-black">{total || '—'}</span>
        </div>
        <p className="text-[11px] text-white/50">Shipping and taxes are calculated at checkout.</p>
      </div>

      <div className="border border-white/10 bg-white/5 p-4 space-y-3">
        <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Promo code</p>
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            className="bg-black border-white/20 text-white"
          />
          <Button
            onClick={onApply}
            disabled={isLoading || !String(code || '').trim()}
            className="bg-[#FF1493] text-black hover:bg-white font-black uppercase"
          >
            Apply
          </Button>
        </div>
      </div>

      <SheetClose asChild>
        <Button
          asChild
          disabled={isLoading || lines.length === 0}
          className="w-full bg-[#00D9FF] text-black hover:bg-white font-black uppercase py-6"
        >
          <Link to="/checkout/start">Checkout</Link>
        </Button>
      </SheetClose>

      <Link to="/cart" className="block text-center text-sm text-white/60 hover:text-white">
        View full cart
      </Link>
    </div>
  );
}

export default function ShopCartDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Open cart"
        >
          <ShoppingCart className="w-5 h-5" />
          {(cart?.totalQuantity || 0) > 0 ? (
            <span className="absolute -top-1 -right-1 bg-[#FF1493] text-black text-[10px] font-black rounded-full px-1.5 py-0.5">
              {cart.totalQuantity}
            </span>
          ) : null}
        </button>
      </SheetTrigger>

      <SheetContent className="bg-black text-white border-l border-white/10 w-full sm:max-w-md">
        <ShopCartPanel />
      </SheetContent>
    </Sheet>
  );
}
