import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';

export default function CheckoutStart() {
  const navigate = useNavigate();
  const { getCheckoutUrlOrThrow, cart } = useShopCart();

  const [isCancelling, setIsCancelling] = useState(false);

  const checkoutUrl = useMemo(() => {
    try {
      return getCheckoutUrlOrThrow({ allowUnbranded: true });
    } catch {
      return null;
    }
  }, [getCheckoutUrlOrThrow]);

  const checkoutError = useMemo(() => {
    try {
      getCheckoutUrlOrThrow({ allowUnbranded: true });
      return null;
    } catch (err) {
      return err?.message || 'Checkout unavailable.';
    }
  }, [getCheckoutUrlOrThrow]);

  useEffect(() => {
    if (!checkoutUrl) return;

    const t = setTimeout(() => {
      if (isCancelling) return;
      window.location.assign(checkoutUrl);
    }, 900);

    return () => clearTimeout(t);
  }, [checkoutUrl, isCancelling]);

  const onCopy = async () => {
    if (!checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      toast.success('Checkout link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <PageShell
      title="Secure checkout"
      subtitle="You’re about to complete payment on our secure checkout. We’ll bring you straight back after."
      eyebrow="MARKET"
      maxWidth="md"
      back="/cart"
      backLabel="Back to cart"
    >
      <div className="border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#FFEB3B]" />
          </div>
          <div className="min-w-0">
            <p className="font-black uppercase tracking-wider">Checkout handoff</p>
            <p className="text-sm text-white/60 mt-1">
              Shipping + taxes are calculated at checkout.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-3 text-white/70 text-sm">
            <ShieldCheck className="w-4 h-4 text-[#00D9FF]" />
            <span>18+ • Consent-first • Care always.</span>
          </div>
          <div className="flex items-center gap-3 text-white/70 text-sm">
            <ExternalLink className="w-4 h-4 text-[#B026FF]" />
            <span>Opens in a new page (you can return anytime).</span>
          </div>
        </div>

        {checkoutError ? (
          <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {checkoutError}
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="border-white/20" asChild>
                <Link to="/cart">Back to cart</Link>
              </Button>
              <Button variant="hot" onClick={() => navigate('/market')}>Shop</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border border-white/10 bg-black/40 p-4">
              <LoadingSpinner label="Redirecting…" />
              <p className="mt-3 text-xs text-white/50">
                If nothing happens, use the buttons below.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="cyan"
                size="xl"
                className="w-full"
                disabled={!checkoutUrl}
                onClick={() => {
                  if (!checkoutUrl) return;
                  window.location.assign(checkoutUrl);
                }}
              >
                Continue to checkout
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/20"
                disabled={!checkoutUrl}
                onClick={onCopy}
              >
                Copy link
              </Button>
            </div>

            {(cart?.totalQuantity || 0) > 0 ? (
              <p className="text-[11px] text-white/50">
                Items in cart: <span className="text-white/80 font-bold">{cart.totalQuantity}</span>
              </p>
            ) : null}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCancelling(true);
                  navigate('/cart');
                }}
                className="text-xs text-white/50 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
