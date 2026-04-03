/**
 * L2MembershipSheet — Membership tiers
 * Shows Free vs Premium tiers and upgrade CTA.
 */

import { Crown, Check, Zap, Eye, MessageCircle, Star, ShoppingBag } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

const FEATURES = [
  { icon: Eye, free: true, premium: true, label: 'View nearby profiles' },
  { icon: MessageCircle, free: true, premium: true, label: 'Send messages' },
  { icon: Star, free: '3/day', premium: 'Unlimited', label: 'Profile likes' },
  { icon: Zap, free: false, premium: true, label: 'See who liked you' },
  { icon: Eye, free: false, premium: true, label: 'Invisible browsing mode' },
  { icon: Crown, free: false, premium: true, label: 'Premium badge on profile' },
  { icon: ShoppingBag, free: '5%', premium: '3%', label: 'Selling fee' },
];

export default function L2MembershipSheet() {
  const { closeSheet } = useSheet();

  const handleUpgrade = () => {
    window.open('https://hotmess.app/premium', '_blank');
    closeSheet();
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

      {/* Pricing */}
      <div className="px-4 pb-4 flex gap-3">
        {[
          { period: '1 Month', price: '£9.99', perMonth: '£9.99/mo' },
          { period: '12 Months', price: '£59.99', perMonth: '£5/mo', badge: 'Best Value', highlight: true },
        ].map(plan => (
          <button
            key={plan.period}
            onClick={handleUpgrade}
            className={`flex-1 rounded-2xl p-4 text-center border transition-all active:scale-95 ${
              plan.highlight
                ? 'bg-[#C8962C]/20 border-[#C8962C]/40'
                : 'bg-[#1C1C1E] border-white/10'
            }`}
          >
            {plan.badge && (
              <span className="inline-block bg-[#C8962C] text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-2">
                {plan.badge}
              </span>
            )}
            <p className={`font-black text-xl ${plan.highlight ? 'text-[#C8962C]' : 'text-white'}`}>
              {plan.price}
            </p>
            <p className="text-white/40 text-xs mt-0.5">{plan.period}</p>
            <p className="text-white/30 text-[10px] mt-1">{plan.perMonth}</p>
          </button>
        ))}
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
          {FEATURES.map(({ icon: Icon, free, premium, label }) => (
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
                {premium === true
                  ? <Check className="w-4 h-4 text-[#C8962C] mx-auto" />
                  : <span className="text-[#C8962C] text-[10px] font-bold">{premium}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-6">
        <button
          onClick={handleUpgrade}
          className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Crown className="w-4 h-4" />
          Upgrade Now
        </button>
        <p className="text-center text-white/25 text-[10px] mt-2">
          Cancel anytime · Secure payment via Stripe
        </p>
      </div>
    </div>
  );
}
