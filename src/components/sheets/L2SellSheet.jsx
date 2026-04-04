/**
 * L2SellSheet — List an Item for sale
 *
 * Tier-gated: only Connected, Promoter, or Venue tiers can sell.
 * Writes to `preloved_listings` table via the market data layer.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { createListing } from '@/lib/data/market';
import {
  Camera, X, Loader2, Package, CheckCircle,
  ChevronDown, Crown, Sparkles, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Clothing', 'Gear', 'Electronics', 'Art', 'Tickets', 'Books', 'Other'];
const CONDITIONS = [
  { value: 'new', label: 'New with tags' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];
const MAX_PHOTOS = 4;
const SELL_TIERS = ['connected', 'promoter', 'venue'];

function TierGate({ onUpgrade }) {
  const benefits = [
    { icon: ShieldCheck, text: 'Sell on MESSMARKET' },
    { icon: TrendingUp, text: 'Priority placement in search' },
    { icon: Sparkles, text: 'Verified seller badge' },
    { icon: Crown, text: 'Lower platform fees' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full px-6 py-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-[#C8962C]/15 border-2 border-[#C8962C]/40 flex items-center justify-center mb-6"
      >
        <Crown className="w-10 h-10 text-[#C8962C]" />
      </motion.div>

      <h2 className="text-white font-black text-xl uppercase mb-2">Upgrade to Sell</h2>
      <p className="text-white/50 text-sm mb-6 max-w-xs">
        Upgrade to <span className="text-[#C8962C] font-bold">Connected</span> or above to list items on MESSMARKET.
      </p>

      <div className="w-full max-w-xs space-y-3 mb-8">
        {benefits.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="flex items-center gap-3 px-4 py-3 bg-[#1C1C1E] rounded-xl border border-white/[0.06]"
          >
            <Icon className="w-4 h-4 text-[#C8962C] flex-shrink-0" />
            <span className="text-white/70 text-sm">{text}</span>
          </motion.div>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onUpgrade}
        className="w-full max-w-xs bg-[#C8962C] text-black font-black text-sm uppercase tracking-wide rounded-2xl py-4 flex items-center justify-center gap-2"
      >
        <Crown className="w-4 h-4" />
        View Membership Tiers
      </motion.button>
    </motion.div>
  );
}

export default function L2SellSheet() {
  const { closeSheet, openSheet } = useSheet();
  const photoInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Tier gate + verification gate
  const [userTier, setUserTier] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showVerifyGate, setShowVerifyGate] = useState(false);
  const [tierLoading, setTierLoading] = useState(true);

  useEffect(() => {
    const checkTierAndVerification = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('membership_tier, is_verified')
            .eq('id', session.user.id)
            .single();
          setUserTier(profile?.membership_tier || 'mess');
          setIsVerified(profile?.is_verified === true);
        } else {
          setUserTier('mess');
        }
        // Also try RPC for tier
        const { data, error } = await supabase.rpc('get_user_tier');
        if (!error && data?.tier) {
          setUserTier(data.tier);
        }
      } catch {
        setUserTier('mess');
      } finally {
        setTierLoading(false);
      }
    };
    checkTierAndVerification();
  }, []);

  const [form, setForm] = useState({
    title: '',
    price: '',
    category: '',
    condition: 'good',
    description: '',
    photos: [],
  });

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const uploadPhoto = async (file) => {
    const { data: { user } } = await supabase.auth.getUser();
    return uploadToStorage(file, 'listing-images', user.id);
  };

  const handleSubmit = async () => {
    if (!isVerified) { setShowVerifyGate(true); return; }
    if (!form.title.trim()) return toast.error('Add a title');
    if (!form.price || isNaN(parseFloat(form.price))) return toast.error('Add a price');
    if (!form.category) return toast.error('Choose a category');
    if (!termsAccepted) return toast.error('Please accept the Seller Terms');

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to sell');

      const { data: existingSeller } = await supabase
        .from('market_sellers')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!existingSeller) {
        const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url, email').eq('id', user.id).single();
        await supabase.from('market_sellers').insert({
          owner_id: user.id,
          display_name: profile?.display_name || 'Seller',
          avatar_url: profile?.avatar_url || null,
          email: profile?.email || user.email,
          status: 'active',
        }).then(null, () => {});
      }

      const imageUrls = [];
      for (const p of form.photos) {
        try {
          const url = await uploadPhoto(p.file);
          imageUrls.push(url);
        } catch {
          // Photo upload failed — continue
        }
      }

      const result = await createListing({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        category: form.category.toLowerCase(),
        condition: form.condition,
        images: imageUrls,
      });

      if (result) {
        setSubmitted(true);
      } else {
        toast.error('Failed to list item. Are you signed in?');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to list item');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - form.photos.length;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    set('photos', [...form.photos, ...toAdd]);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    set('photos', form.photos.filter((_, i) => i !== idx));
  };

  // Loading state
  if (tierLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  // Tier gate
  if (!SELL_TIERS.includes(userTier)) {
    return <TierGate onUpgrade={() => openSheet('membership')} />;
  }

  // Verification gate — sellers must verify identity
  if (!isVerified && showVerifyGate) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[#C8962C]/15 flex items-center justify-center mb-6">
          <ShieldCheck className="w-8 h-8 text-[#C8962C]" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Verify to Sell</h2>
        <p className="text-white/50 text-sm mb-6 max-w-xs">
          For buyer safety, sellers must complete identity verification before listing items.
        </p>
        <button
          onClick={() => openSheet('verification', {})}
          className="w-full max-w-xs py-4 bg-[#C8962C] text-black font-bold rounded-2xl mb-3"
        >
          Start Verification
        </button>
        <button onClick={() => closeSheet()} className="text-white/30 text-sm">
          Maybe later
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full py-16 px-6 text-center gap-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-[#C8962C]/15 border-2 border-[#C8962C] flex items-center justify-center"
        >
          <CheckCircle className="w-10 h-10 text-[#C8962C]" />
        </motion.div>
        <div>
          <h2 className="text-xl font-black text-white uppercase">Listed!</h2>
          <p className="text-white/50 text-sm mt-2">Your item is live in MessMarket.</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button
            onClick={() => {
              setSubmitted(false);
              setForm({ title: '', price: '', category: '', condition: 'good', description: '', photos: [] });
            }}
            className="flex-1 bg-[#1C1C1E] text-white border border-white/15"
          >
            List Another
          </Button>
          <Button onClick={closeSheet} className="flex-1 bg-[#C8962C] text-black font-black">
            Done
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Photos */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Photos ({form.photos.length}/{MAX_PHOTOS})
          </label>
          <div className="grid grid-cols-4 gap-2">
            {form.photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/[0.06]">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {form.photos.length < MAX_PHOTOS && (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/30 hover:border-[#C8962C]/50 hover:text-[#C8962C]/50 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase">Add</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Title */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">Title *</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="What are you selling?"
            maxLength={80}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#C8962C]/60 text-sm transition-colors"
          />
        </div>

        {/* Price + Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">Price (£) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8962C] font-black text-sm">£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#C8962C]/60 text-sm transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">Category *</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C8962C]/60 text-sm appearance-none transition-colors"
              >
                <option value="">Choose...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">Condition</label>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                onClick={() => set('condition', c.value)}
                className={cn(
                  'px-3 py-2.5 rounded-xl border text-sm font-bold text-left transition-all',
                  form.condition === c.value
                    ? 'border-[#C8962C] bg-[#C8962C]/10 text-[#C8962C]'
                    : 'border-white/10 bg-[#1C1C1E] text-white/60'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Tell buyers more about the item..."
            rows={3}
            maxLength={500}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#C8962C]/60 text-sm resize-none transition-colors"
          />
          <p className="text-white/20 text-[10px] text-right mt-1">{form.description.length}/500</p>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="px-4 py-4 border-t border-white/10 bg-black/80">
        <div className="mb-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
          <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-wider mb-1">Prohibited Items</p>
          <p className="text-white/30 text-[10px] leading-relaxed">
            Weapons, drugs, counterfeit goods, stolen property, and unverified adult content are prohibited and will be removed.
          </p>
        </div>

        <label className="flex items-start gap-3 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#1C1C1E] accent-[#C8962C]"
          />
          <span className="text-white/40 text-[11px] leading-relaxed">
            I confirm this item is legal to sell, not counterfeit, and I accept the 10% platform fee and HOTMESS Seller Terms.
          </span>
        </label>

        <div className="flex items-center gap-2 mb-3 text-white/30 text-xs">
          <Package className="w-3.5 h-3.5 flex-shrink-0" />
          <span>HOTMESS takes 10% on each sale · Payouts within 3 business days</span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!form.title.trim() || !form.price || !form.category || !termsAccepted || loading}
          className={cn(
            'w-full py-4 font-black uppercase tracking-wide rounded-2xl text-sm transition-all',
            form.title.trim() && form.price && form.category && termsAccepted
              ? 'bg-[#C8962C] text-black hover:bg-[#D4A84B]'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}
        >
          {loading
            ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Listing...</span>
            : 'List for Sale'}
        </Button>
      </div>
    </div>
  );
}
