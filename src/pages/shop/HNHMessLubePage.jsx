import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

const AGE_KEY = 'hnhmess_age_confirmed';

const getAgeConfirmed = () => {
  try { return localStorage.getItem(AGE_KEY) === 'true'; } catch { return false; }
};

const STORE_URL = import.meta.env.VITE_SHOPIFY_STORE_URL || '';
const VARIANT_ID = import.meta.env.VITE_SHOPIFY_LUBE_VARIANT_ID || '';

function AgeGate({ onConfirm }) {
  return (
    <div className="fixed inset-0 bg-[#050507] flex items-center justify-center z-50 px-6">
      <div className="max-w-sm w-full text-center space-y-8">
        {/* Brand */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#C8962C]/60 font-medium">
            HNH MESS London
          </p>
          <h1 className="text-3xl font-black text-white mt-3 tracking-tight">
            Age Verification
          </h1>
        </div>

        <p className="text-white/60 text-sm leading-relaxed">
          This product is intended for adults only. You must be 18 or older to view and purchase.
        </p>

        <button
          onClick={onConfirm}
          className="w-full py-4 bg-[#C8962C] text-black font-black uppercase tracking-wider text-sm rounded-none hover:bg-[#C8962C]/90 transition-colors"
        >
          I confirm I am 18+
        </button>

        <Link
          to="/"
          className="block text-white/40 text-xs hover:text-white/60 transition-colors"
        >
          Leave this page
        </Link>
      </div>
    </div>
  );
}

export default function HNHMessLubePage() {
  const [ageConfirmed, setAgeConfirmed] = useState(getAgeConfirmed);

  const handleAgeConfirm = useCallback(() => {
    try { localStorage.setItem(AGE_KEY, 'true'); } catch {}
    setAgeConfirmed(true);
  }, []);

  const handleBuy = useCallback(() => {
    if (!STORE_URL || !VARIANT_ID) {
      alert('Shop not configured yet — check back soon.');
      return;
    }
    const checkoutUrl = `https://${STORE_URL}/cart/${VARIANT_ID}:1`;
    window.location.href = checkoutUrl;
  }, []);

  if (!ageConfirmed) {
    return <AgeGate onConfirm={handleAgeConfirm} />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <header className="px-6 pt-safe-top">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="text-white/50 text-sm hover:text-white transition-colors">
            ← Back
          </Link>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#C8962C]/60 font-medium">
            HNH MESS
          </p>
        </div>
      </header>

      {/* Product */}
      <main className="px-6 pb-20 max-w-lg mx-auto">
        {/* Image placeholder — dark gradient with brand text */}
        <div className="aspect-square bg-gradient-to-br from-[#1C1C1E] to-[#050507] border border-white/10 flex items-center justify-center mb-8">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.5em] text-[#C8962C]/40 font-medium">
              HNH MESS
            </p>
            <p className="text-2xl font-black text-white/20 mt-2 tracking-tight">
              LUBE
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/10 mt-3 font-medium">
              London
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight">HNH MESS Lube</h1>
            <p className="text-[#C8962C] text-xl font-black mt-2">£15.00</p>
          </div>

          <p className="text-white/60 text-sm leading-relaxed">
            Premium personal lubricant from HNH MESS London. Smooth, long-lasting, body-safe formula.
          </p>

          {/* Buy CTA */}
          <button
            onClick={handleBuy}
            className="w-full py-4 bg-[#C8962C] text-black font-black uppercase tracking-wider text-sm hover:bg-[#C8962C]/90 transition-colors"
          >
            Buy Now — £15
          </button>

          {/* Info */}
          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-lg">📦</span>
              <div>
                <p className="text-white/80 text-sm font-medium">Free UK shipping</p>
                <p className="text-white/40 text-xs">Discreet packaging. Usually dispatched within 2 business days.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-white/30 text-lg">🔒</span>
              <div>
                <p className="text-white/80 text-sm font-medium">Secure checkout</p>
                <p className="text-white/40 text-xs">Payment handled securely by Shopify. We never see your card details.</p>
              </div>
            </div>
          </div>

          {/* Legal footer */}
          <div className="border-t border-white/10 pt-6 flex gap-4">
            <Link to="/legal/privacy" className="text-white/30 text-xs hover:text-white/50 transition-colors">
              Privacy
            </Link>
            <Link to="/legal/terms" className="text-white/30 text-xs hover:text-white/50 transition-colors">
              Terms
            </Link>
          </div>

          <p className="text-white/20 text-[10px] text-center">
            18+ only • HNH MESS London
          </p>
        </div>
      </main>
    </div>
  );
}
