/**
 * L2MembershipSheet — Membership tiers + Stripe checkout
 *
 * Fetches tiers from membership_tiers table.
 * "Upgrade" calls /api/stripe/create-checkout-session → redirects to Stripe Checkout.
 *
 * STRIPE KEYS: If STRIPE_SECRET_KEY is missing in Vercel env, the API returns 503
 * and the sheet shows a "not yet available" message. Add the key in Vercel to activate.
 */

import { useState, useEffect } from 'react';
import { Crown, Check, Zap, Eye, MessageCircle, Loader2, Music, MapPin, Users, Radio } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const FEATURE_ROWS = [
  { icon: Eye,           label: 'Full Ghosted grid',      free: '3 previews', paid: 'Unlimited' },
  { icon: MessageCircle, label: 'Messaging & taps',       free: false,        paid: true        },
  { icon: Zap,           label: 'Tonight intention',      free: false,        paid: true        },
  { icon: Music,         label: 'Smash Daddys library',   free: '90s preview',paid: 'Full tracks' },
  { icon: MapPin,        label: 'Beacon drops/month',     free: '0',          paid: '3'         },
  { icon: Users,         label: 'Personas',               free: '1',          paid: '2'         },
  { icon: Radio,         label: 'HOTMESS Radio',          free: true,         paid: true        },
];

function penceToDisplay(pence) {
  const pounds = Number(pence) / 100;
  return `£${pounds % 1 === 0 ? pounds.toFixed(0) : pounds.toFixed(2)}`;
}

export default function L2MembershipSheet() {
  const { closeSheet } = useSheet();
  const [tiers, setTiers] = useState([]);
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tiersLoading, setTiersLoading] = useState(true);

  // Fetch paid tiers on mount
  useEffect(() => {
    supabase
      .from('membership_tiers')
      .select('id, name, price')
      .gt('price', 0)
      .order('price', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setTiers(data);
          setSelectedTierId(data[0].id);
        }
        setTiersLoading(false);
      });
  }, []);

  const selectedTier = tiers.find((t) => t.id === selectedTierId);

  const handleUpgrade = async () => {
    if (!selectedTier || loading) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sign in to upgrade');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tierId: selectedTier.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          toast.info('This is being finished now');
        } else {
          toast.error(data?.error || 'Could not start checkout');
        }
        setLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[MembershipSheet] checkout error:', err);
      toast.error('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#C8962C]/20 border border-[#C8962C]/30 flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-[#C8962C]" />
        </div>
        <h2 className="text-white font-black text-xl">Go Premium</h2>
        <p className="text-white/50 text-sm mt-1">Unlock the full HOTMESS experience</p>
      </div>

      {/* Tier selector */}
      <div className="px-4 pb-4 flex gap-3">
        {tiersLoading ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : tiers.length === 0 ? (
          <p className="text-white/30 text-xs text-center flex-1 py-4">Tiers loading…</p>
        ) : (
          tiers.slice(0, 2).map((tier) => {
            const isSelected = tier.id === selectedTierId;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                className={`flex-1 rounded-2xl p-4 text-center border transition-all active:scale-95 ${
                  isSelected ? 'bg-[#C8962C]/20 border-[#C8962C]/40' : 'bg-[#1C1C1E] border-white/10'
                }`}
              >
                {isSelected && (
                  <span className="inline-block bg-[#C8962C] text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-2">
                    Selected
                  </span>
                )}
                {tier.id === 2 && !isSelected && (
                  <span className="inline-block bg-[#C8962C] text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-2">
                    Most Popular
                  </span>
                )}
                <p className={`font-black text-xl ${isSelected ? 'text-[#C8962C]' : 'text-white'}`}>
                  {penceToDisplay(tier.price)}
                </p>
                <p className="text-white/40 text-xs mt-0.5 capitalize">
                  {tier.name.toUpperCase()}
                </p>
              </button>
            );
          })
        )}
      </div>

      {/* Feature comparison */}
      <div className="px-4 pb-4">
        <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">What you get</p>
        <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
          <div className="flex px-4 py-2 border-b border-white/5">
            <div className="flex-1" />
            <div className="w-16 text-center text-white/30 text-[10px] font-black uppercase">Free</div>
            <div className="w-16 text-center text-[#C8962C] text-[10px] font-black uppercase">Premium</div>
          </div>
          {FEATURE_ROWS.map(({ icon: Icon, label, free, paid }) => (
            <div key={label} className="flex items-center px-4 py-3 border-b border-white/5 last:border-0">
              <div className="flex-1 flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                <span className="text-white/70 text-xs">{label}</span>
              </div>
              <div className="w-16 text-center">
                {free === true
                  ? <Check className="w-4 h-4 text-white/40 mx-auto" />
                  : free === false
                  ? <span className="text-white/15 text-sm">—</span>
                  : <span className="text-white/40 text-[10px] font-bold">{free}</span>}
              </div>
              <div className="w-16 text-center">
                {paid === true
                  ? <Check className="w-4 h-4 text-[#C8962C] mx-auto" />
                  : <span className="text-[#C8962C] text-[10px] font-bold">{paid}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-6">
        <button
          onClick={handleUpgrade}
          disabled={loading || tiersLoading || !selectedTier}
          className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
          {loading ? 'Redirecting to checkout…' : `Upgrade${selectedTier ? ` — ${penceToDisplay(selectedTier.price)}` : ''}`}
        </button>
        <p className="text-center text-white/25 text-[10px] mt-2">
          Secure payment via Stripe · One-off activation fee
        </p>
      </div>
    </div>
  );
}
