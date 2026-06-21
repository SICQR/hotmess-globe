/**
 * HnhMessPromoCard â Dismissible in-feed promo card for HNH MESS
 *
 * - Shows MESS20 discount code
 * - Links to /market (HNH MESS shop)
 * - 7-day dismiss cooldown stored in Supabase per user
 * - Tracks impressions, dismisses, CTA taps in promo_card_interactions
 * - Never renders for unauthenticated users
 * - Self-contained: no external state deps
 *
 * Phil 2026-06-21
 */

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const PROMO_ID = 'hnhmess-mess20-june2026';
const DISCOUNT_CODE = 'MESS20';
const COOLDOWN_DAYS = 7;
const GOLD = '#C8962C';

export function HnhMessPromoCard({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const check = async () => {
      const { data: dismissed, error } = await supabase.rpc('has_dismissed_promo', {
        p_user_id: user.id,
        p_promo_id: PROMO_ID,
        p_cooldown_days: COOLDOWN_DAYS,
      });

      if (cancelled) return;

      if (!error && !dismissed) {
        setVisible(true);
        supabase.from('promo_card_interactions').insert({
          user_id: user.id,
          promo_id: PROMO_ID,
          action: 'impression',
        }).then(() => {});
      }
      setChecked(true);
    };

    check();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleDismiss = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    if (!user?.id) return;
    await supabase.from('promo_card_interactions').insert({
      user_id: user.id,
      promo_id: PROMO_ID,
      action: 'dismiss',
    });
  }, [user?.id]);

  const handleCta = useCallback(async () => {
    if (user?.id) {
      supabase.from('promo_card_interactions').insert({
        user_id: user.id,
        promo_id: PROMO_ID,
        action: 'cta_tap',
      }).then(() => {});
    }
    navigate('/market');
  }, [user?.id, navigate]);

  if (!checked || !visible) return null;

  return (
    <div
      className={`mx-4 mb-4 rounded-2xl overflow-hidden relative ${className}`}
      style={{ background: '#0a0805', border: `1px solid ${GOLD}30` }}
    >
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
        aria-label="Dismiss HNH MESS promo"
      >
        <X className="w-3.5 h-3.5 text-white/60" />
      </button>

      {/* Visual header */}
      <div
        className="w-full h-32 flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d0905 0%, #1a0f06 50%, #0d0905 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 50%, ${GOLD} 0%, transparent 70%)` }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ opacity: 0.04 }}
        >
          <span className="font-black italic text-[5rem] text-white leading-none">HNH</span>
        </div>
        <div className="relative text-center z-10 px-8">
          <p className="text-[9px] font-black tracking-[0.35em] uppercase text-white/35 mb-1">
            HOTMESS presents
          </p>
          <h3
            className="font-black text-3xl tracking-[0.12em] uppercase leading-none"
            style={{ color: GOLD }}
          >
            HNH MESS
          </h3>
          <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-white/40 mt-1">
            Aftercare &amp; Intimate Wellness
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        <h4 className="text-white font-black text-[17px] leading-tight mb-1">
          Aftercare, sorted.
        </h4>
        <p className="text-white/45 text-[12px] leading-snug mb-4">
          20% off everything in HNH MESS. Use code at checkout.
        </p>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0"
            style={{ borderColor: `${GOLD}45`, background: `${GOLD}10` }}
          >
            <span className="text-[10px] text-white/35 font-bold tracking-widest uppercase">CODE</span>
            <span className="font-black text-[13px] tracking-[0.12em]" style={{ color: GOLD }}>
              {DISCOUNT_CODE}
            </span>
          </div>
          <button
            onClick={handleCta}
            className="flex-1 py-2.5 rounded-xl font-black text-[13px] text-black active:scale-95 transition-transform"
            style={{ background: GOLD }}
          >
            Shop HNH MESS
          </button>
        </div>
      </div>
    </div>
  );
}

export default HnhMessPromoCard;
