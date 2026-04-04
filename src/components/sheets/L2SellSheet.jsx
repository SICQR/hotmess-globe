/**
 * L2SellSheet -- Preloved Listing Creation Flow
 *
 * 7-step flow: Photos -> Details -> Price -> Delivery -> Review -> Publish
 *
 * Writes to `preloved_listings` (new schema with enums).
 * Chat-first: no cart, no checkout. Listing goes live, buyers message seller.
 *
 * Colour: #9E7D47 (preloved brown)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import {
  Camera, X, Loader2, CheckCircle, ChevronLeft,
  ShieldCheck, MapPin, Truck, PackageCheck, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';

// ---- Constants matching DB enums --------------------------------------------

const PRELOVED_BROWN = '#9E7D47';
const AMBER = '#C8962C';

const CATEGORIES = [
  { value: 'clothing', label: 'Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'art', label: 'Art' },
  { value: 'music', label: 'Music' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'gear', label: 'Gear' },
  { value: 'other', label: 'Other' },
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'worn', label: 'Worn' },
  { value: 'used', label: 'Used' },
];

const DELIVERY_TYPES = [
  { value: 'pickup', label: 'Pickup only', icon: MapPin },
  { value: 'shipping', label: 'Shipping only', icon: Truck },
  { value: 'both', label: 'Pickup or shipping', icon: PackageCheck },
];

const MAX_PHOTOS = 6;
const STEPS = ['photos', 'details', 'price', 'delivery', 'review'];

// ---- Step indicator ---------------------------------------------------------

function StepBar({ current, total }) {
  return (
    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1 rounded-full transition-colors duration-300"
          style={{
            backgroundColor: i <= current
              ? PRELOVED_BROWN
              : 'rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </div>
  );
}

// ---- Verification gate ------------------------------------------------------

function VerifyGate({ onVerify, onClose }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(158,125,71,0.15)' }}>
        <ShieldCheck className="w-8 h-8" style={{ color: PRELOVED_BROWN }} />
      </div>
      <h2 className="text-white font-bold text-xl mb-2">Verify to Sell</h2>
      <p className="text-white/50 text-sm mb-6 max-w-xs">
        For safety, sellers must complete identity verification before listing.
      </p>
      <button
        onClick={onVerify}
        className="w-full max-w-xs py-4 text-black font-bold rounded-2xl mb-3"
        style={{ backgroundColor: PRELOVED_BROWN }}
      >
        Start Verification
      </button>
      <button onClick={onClose} className="text-white/30 text-sm">
        Maybe later
      </button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function L2SellSheet() {
  const { closeSheet, openSheet } = useSheet();
  const photoInputRef = useRef(null);

  // Auth + verification
  const [userId, setUserId] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [needsVerify, setNeedsVerify] = useState(false);

  // Flow state
  const [step, setStep] = useState(0); // index into STEPS
  const [submitting, setSubmitting] = useState(false);
  const [published, setPublished] = useState(false);

  // Form state
  const [photos, setPhotos] = useState([]); // { file, preview }[]
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('good');
  const [price, setPrice] = useState('');
  const [openToOffers, setOpenToOffers] = useState(false);
  const [deliveryType, setDeliveryType] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ---- Auth check -----------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_verified')
            .eq('id', session.user.id)
            .single();
          setIsVerified(profile?.is_verified === true);
        }
      } catch { /* noop */ }
      setCheckingAuth(false);
    })();
  }, []);

  // ---- Navigation -----------------------------------------------------------
  const stepName = STEPS[step];
  const canGoBack = step > 0;
  const goBack = () => setStep(s => Math.max(0, s - 1));
  const goNext = () => setStep(s => Math.min(STEPS.length - 1, s + 1));

  // ---- Validation per step --------------------------------------------------
  const isStepValid = useCallback(() => {
    switch (stepName) {
      case 'photos':
        return photos.length >= 1;
      case 'details':
        return title.trim().length >= 3 && title.trim().length <= 120
          && description.trim().length >= 10 && description.trim().length <= 1200
          && category !== '';
      case 'price':
        return price && parseFloat(price) > 0;
      case 'delivery':
        return deliveryType !== '';
      case 'review':
        return termsAccepted;
      default:
        return false;
    }
  }, [stepName, photos.length, title, description, category, price, deliveryType, termsAccepted]);

  // ---- Photo handlers -------------------------------------------------------
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...toAdd]);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const movePhoto = (from, to) => {
    setPhotos(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  // ---- Submit ---------------------------------------------------------------
  const handlePublish = async () => {
    if (!isVerified) { setNeedsVerify(true); return; }
    if (!isStepValid()) return;
    setSubmitting(true);

    try {
      // Upload photos
      const imageUrls = [];
      for (const p of photos) {
        try {
          const url = await uploadToStorage(p.file, 'listing-images', userId);
          imageUrls.push(url);
        } catch {
          // continue on individual photo failure
        }
      }

      if (imageUrls.length === 0) {
        toast.error('At least one photo must upload successfully');
        setSubmitting(false);
        return;
      }

      // Ensure seller record exists
      const { data: existingSeller } = await supabase
        .from('market_sellers')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (!existingSeller) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, email')
          .eq('id', userId)
          .single();
        await supabase.from('market_sellers').insert({
          owner_id: userId,
          display_name: profile?.display_name || 'Seller',
          avatar_url: profile?.avatar_url || null,
          email: profile?.email || '',
          status: 'active',
        }).then(null, () => {});
      }

      // Insert listing — new schema fields
      const { data: listing, error } = await supabase
        .from('preloved_listings')
        .insert({
          seller_id: userId,
          title: title.trim(),
          description: description.trim(),
          category: category,
          condition: condition, // maps to item_condition if column renamed, or condition
          price: parseFloat(price), // maps to price_gbp if column renamed, or price
          images: imageUrls,
          status: 'active', // go live immediately
          delivery_type: deliveryType || 'both',
          open_to_offers: openToOffers,
          pickup_notes: pickupNotes.trim() || null,
          shipping_notes: shippingNotes.trim() || null,
          cover_image_url: imageUrls[0] || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Insert individual images with sort order
      if (listing?.id && imageUrls.length > 0) {
        const imageRows = imageUrls.map((url, i) => ({
          listing_id: listing.id,
          image_url: url,
          sort_order: i,
        }));
        await supabase.from('preloved_listing_images').insert(imageRows).then(null, () => {});
      }

      setPublished(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to publish listing');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Loading state --------------------------------------------------------
  if (checkingAuth) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRELOVED_BROWN }} />
      </div>
    );
  }

  // ---- Verification gate ----------------------------------------------------
  if (needsVerify && !isVerified) {
    return (
      <VerifyGate
        onVerify={() => openSheet('verification', {})}
        onClose={() => setNeedsVerify(false)}
      />
    );
  }

  // ---- Published success ----------------------------------------------------
  if (published) {
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
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(158,125,71,0.15)', border: `2px solid ${PRELOVED_BROWN}` }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: PRELOVED_BROWN }} />
        </motion.div>
        <div>
          <h2 className="text-xl font-black text-white uppercase">Listed</h2>
          <p className="text-white/50 text-sm mt-2">Your listing is live. Buyers can message you now.</p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setPublished(false);
              setStep(0);
              setPhotos([]);
              setTitle('');
              setDescription('');
              setCategory('');
              setCondition('good');
              setPrice('');
              setDeliveryType('');
              setTermsAccepted(false);
            }}
            className="flex-1 h-12 rounded-xl font-bold text-sm border border-white/15 text-white/70 active:scale-95 transition-transform"
          >
            List another
          </button>
          <button
            onClick={closeSheet}
            className="flex-1 h-12 rounded-xl font-black text-sm text-black active:scale-95 transition-transform"
            style={{ backgroundColor: PRELOVED_BROWN }}
          >
            Done
          </button>
        </div>
      </motion.div>
    );
  }

  // ---- Step content ---------------------------------------------------------
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center h-12 px-4 border-b border-white/10">
        {canGoBack ? (
          <button onClick={goBack} className="w-8 h-8 flex items-center justify-center -ml-1">
            <ChevronLeft className="w-5 h-5 text-white/50" />
          </button>
        ) : (
          <div className="w-8" />
        )}
        <h2 className="flex-1 text-center text-sm font-bold text-white uppercase tracking-wider">
          {stepName === 'photos' && 'Add photos'}
          {stepName === 'details' && 'Item details'}
          {stepName === 'price' && 'Set price'}
          {stepName === 'delivery' && 'Delivery'}
          {stepName === 'review' && 'Review'}
        </h2>
        <button onClick={closeSheet} className="w-8 h-8 flex items-center justify-center -mr-1">
          <X className="w-5 h-5 text-white/30" />
        </button>
      </div>

      <StepBar current={step} total={STEPS.length} />

      {/* Step body */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Photos ─────────────────────────────────────── */}
          {stepName === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4"
            >
              <p className="text-white/40 text-xs mb-3">
                Add up to {MAX_PHOTOS} photos. First photo is the cover. Show texture and detail.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/[0.06]">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase" style={{ backgroundColor: PRELOVED_BROWN, color: '#000' }}>
                        Cover
                      </span>
                    )}
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/30 active:border-[#9E7D47]/50 active:text-[#9E7D47]/50 transition-colors"
                  >
                    <Camera className="w-6 h-6" />
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
            </motion.div>
          )}

          {/* ── STEP 2: Details ────────────────────────────────────── */}
          {stepName === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4 space-y-4"
            >
              {/* Title */}
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1.5">
                  Title <span className="text-white/20">({title.length}/120)</span>
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="What are you selling?"
                  maxLength={120}
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none text-sm transition-colors"
                  style={{ fontSize: '16px', borderColor: title.length >= 3 ? 'rgba(158,125,71,0.3)' : undefined }}
                />
                {title.length > 0 && title.length < 3 && (
                  <p className="text-red-400/60 text-[10px] mt-1">Minimum 3 characters</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1.5">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={cn(
                        'px-3 py-2.5 rounded-xl border text-sm font-bold text-left transition-all active:scale-95',
                        category === c.value
                          ? 'text-black'
                          : 'border-white/10 bg-[#1C1C1E] text-white/60'
                      )}
                      style={category === c.value ? { backgroundColor: PRELOVED_BROWN, borderColor: PRELOVED_BROWN } : undefined}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1.5">Condition</label>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setCondition(c.value)}
                      className={cn(
                        'px-3 py-2 rounded-full border text-xs font-bold transition-all active:scale-95',
                        condition === c.value
                          ? 'text-black'
                          : 'border-white/10 bg-[#1C1C1E] text-white/60'
                      )}
                      style={condition === c.value ? { backgroundColor: PRELOVED_BROWN, borderColor: PRELOVED_BROWN } : undefined}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1.5">
                  Description <span className="text-white/20">({description.length}/1200)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={"Line 1: energy\nLine 2: condition / material\nLine 3: how to get it"}
                  rows={4}
                  maxLength={1200}
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm resize-none transition-colors"
                  style={{ fontSize: '16px', borderColor: description.length >= 10 ? 'rgba(158,125,71,0.3)' : undefined }}
                />
                {description.length > 0 && description.length < 10 && (
                  <p className="text-red-400/60 text-[10px] mt-1">Minimum 10 characters</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Price ──────────────────────────────────────── */}
          {stepName === 'price' && (
            <motion.div
              key="price"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4 space-y-4"
            >
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1.5">Price (GBP)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg" style={{ color: PRELOVED_BROWN }}>
                    {'\u00a3'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-10 pr-4 py-4 text-white text-2xl font-black focus:outline-none transition-colors"
                    style={{ fontSize: '24px', borderColor: price && parseFloat(price) > 0 ? 'rgba(158,125,71,0.3)' : undefined }}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={openToOffers}
                  onChange={e => setOpenToOffers(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-[#1C1C1E] accent-[#9E7D47]"
                />
                <span className="text-white/60 text-sm font-medium">Open to offers</span>
              </label>

              <p className="text-white/25 text-[10px] px-1">
                All transactions happen via chat. Agree price with the buyer before exchanging.
              </p>
            </motion.div>
          )}

          {/* ── STEP 4: Delivery ───────────────────────────────────── */}
          {stepName === 'delivery' && (
            <motion.div
              key="delivery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4 space-y-4"
            >
              <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1">How can buyers get this?</label>
              <div className="space-y-2">
                {DELIVERY_TYPES.map(d => {
                  const Icon = d.icon;
                  const isActive = deliveryType === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => setDeliveryType(d.value)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all active:scale-[0.98]',
                        isActive
                          ? 'border-[#9E7D47] bg-[#9E7D47]/10'
                          : 'border-white/10 bg-[#1C1C1E]'
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: isActive ? PRELOVED_BROWN : 'rgba(255,255,255,0.3)' }} />
                      <span className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-white/60')}>{d.label}</span>
                    </button>
                  );
                })}
              </div>

              {(deliveryType === 'pickup' || deliveryType === 'both') && (
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1.5">Pickup notes</label>
                  <input
                    value={pickupNotes}
                    onChange={e => setPickupNotes(e.target.value)}
                    placeholder="e.g. Central London, evenings"
                    maxLength={200}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-white/20 text-[10px] mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Approximate area only. Never share exact address in the listing.
                  </p>
                </div>
              )}

              {(deliveryType === 'shipping' || deliveryType === 'both') && (
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1.5">Shipping notes</label>
                  <input
                    value={shippingNotes}
                    onChange={e => setShippingNotes(e.target.value)}
                    placeholder="e.g. Royal Mail tracked, UK only"
                    maxLength={200}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 5: Review ─────────────────────────────────────── */}
          {stepName === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4 space-y-4"
            >
              {/* Preview card */}
              <div className="bg-[#1C1C1E] rounded-xl overflow-hidden border border-white/[0.06]">
                {photos[0] && (
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={photos[0].preview} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: 'rgba(158,125,71,0.85)', color: '#fff' }}>
                      Preloved
                    </span>
                    {photos.length > 1 && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white/70">
                        +{photos.length - 1} more
                      </span>
                    )}
                  </div>
                )}
                <div className="p-3">
                  <h3 className="text-white font-bold text-sm">{title}</h3>
                  <p className="text-white/40 text-xs mt-1 line-clamp-2">{description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-black text-lg" style={{ color: PRELOVED_BROWN }}>{'\u00a3'}{parseFloat(price || '0').toFixed(0)}</span>
                    {openToOffers && <span className="text-white/30 text-[10px] font-bold uppercase">Open to offers</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-white/30 text-[10px]">
                    <span className="capitalize">{CONDITIONS.find(c => c.value === condition)?.label}</span>
                    <span>{'|'}</span>
                    <span className="capitalize">{CATEGORIES.find(c => c.value === category)?.label}</span>
                    <span>{'|'}</span>
                    <span className="capitalize">{DELIVERY_TYPES.find(d => d.value === deliveryType)?.label}</span>
                  </div>
                </div>
              </div>

              {/* Safety notice */}
              <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Not allowed
                </p>
                <p className="text-white/30 text-[10px] leading-relaxed">
                  Weapons, drugs, counterfeit goods, stolen property, explicit content, services, or unsafe items. Listings that violate terms will be removed.
                </p>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#1C1C1E] accent-[#9E7D47]"
                />
                <span className="text-white/40 text-[11px] leading-relaxed">
                  I confirm this item is mine to sell, accurately described, not prohibited, and I accept the{' '}
                  <button onClick={() => openSheet('preloved-terms', {})} className="underline" style={{ color: PRELOVED_BROWN }}>
                    Preloved Terms
                  </button>.
                </span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sticky bottom CTA ─────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-white/10 bg-black/80">
        {stepName === 'review' ? (
          <button
            onClick={handlePublish}
            disabled={!termsAccepted || submitting}
            className={cn(
              'w-full py-4 font-black uppercase tracking-wide rounded-2xl text-sm transition-all active:scale-[0.98]',
              termsAccepted
                ? 'text-black'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            )}
            style={termsAccepted ? { backgroundColor: PRELOVED_BROWN } : undefined}
          >
            {submitting
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</span>
              : 'Publish listing'}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!isStepValid()}
            className={cn(
              'w-full py-4 font-black uppercase tracking-wide rounded-2xl text-sm transition-all active:scale-[0.98]',
              isStepValid()
                ? 'text-black'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            )}
            style={isStepValid() ? { backgroundColor: PRELOVED_BROWN } : undefined}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
