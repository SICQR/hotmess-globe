/**
 * OnboardingGate — 6-step luxury onboarding
 *
 * Noir-gold design. Every step unified under one brand color.
 * No cyan, no purple, no neon-green — only gold (#C8962C).
 *
 * Steps: Age → Terms → Permissions → Profile+PIN → Photo → Community
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, FileText, MapPin, KeyRound, Camera, Check, Loader2, Delete } from 'lucide-react';
import { toast } from 'sonner';

const AGE_KEY = 'hm_age_confirmed_v1';
const GOLD = '#C8962C';
const GOLD_HOVER = '#D4A84B';
const TOTAL_STEPS = 6;

// SHA-256 hash using Web Crypto API (browser-native)
async function hashPin(pin) {
  const encoded = new TextEncoder().encode(pin);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const springSmooth = { type: 'spring', stiffness: 200, damping: 25 };
const springSnap = { type: 'spring', stiffness: 300, damping: 28 };

const fadeSlide = {
  initial: { opacity: 0, x: 24, filter: 'blur(4px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, x: -24, filter: 'blur(4px)' },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

// ─── Gold Progress Bar ───────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
          Step {current} of {total}
        </p>
      </div>
      <div className="h-[2px] w-full bg-white/8 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: GOLD,
            boxShadow: `0 0 8px rgba(200,150,44,0.5)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={springSmooth}
        />
      </div>
    </div>
  );
}

// ─── Luxury PIN Keypad ───────────────────────────────────────────────────────
function PinInput({ value, onChange, label }) {
  const handleKeyPress = (digit) => {
    if (value.length < 4) {
      onChange(value + digit);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black text-center">
        {label}
      </p>

      {/* PIN dots */}
      <div className="flex gap-4 justify-center mb-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: value.length === i + 1 ? [1.3, 1] : 1,
              backgroundColor: value.length > i ? GOLD : 'rgba(255,255,255,0.08)',
              borderColor: value.length > i ? GOLD : 'rgba(255,255,255,0.15)',
              boxShadow:
                value.length > i
                  ? '0 0 12px rgba(200,150,44,0.5)'
                  : '0 0 0px transparent',
            }}
            transition={springSnap}
            className="w-4 h-4 rounded-full border-2"
          />
        ))}
      </div>

      {/* Number grid — circular luxury buttons */}
      <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <motion.button
            key={n}
            type="button"
            whileTap={{ scale: 0.9, backgroundColor: 'rgba(255,255,255,0.12)' }}
            transition={springSnap}
            onClick={() => handleKeyPress(String(n))}
            className="w-[60px] h-[60px] mx-auto rounded-full bg-white/[0.04] border border-white/10 text-white/80 font-medium text-xl flex items-center justify-center hover:bg-white/8 transition-colors select-none"
          >
            {n}
          </motion.button>
        ))}
        {/* Empty / 0 / Delete */}
        <div />
        <motion.button
          type="button"
          whileTap={{ scale: 0.9, backgroundColor: 'rgba(255,255,255,0.12)' }}
          transition={springSnap}
          onClick={() => handleKeyPress('0')}
          className="w-[60px] h-[60px] mx-auto rounded-full bg-white/[0.04] border border-white/10 text-white/80 font-medium text-xl flex items-center justify-center hover:bg-white/8 transition-colors select-none"
        >
          0
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          transition={springSnap}
          onClick={handleDelete}
          className="w-[60px] h-[60px] mx-auto rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors select-none"
        >
          <Delete className="w-5 h-5 text-[#C8962C]/70" />
        </motion.button>
      </div>
    </div>
  );
}

// ─── Gold CTA button ─────────────────────────────────────────────────────────
function GoldButton({ onClick, disabled, loading, children, className = '' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={springSnap}
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 ${className}`}
      style={{
        background: disabled ? 'rgba(200,150,44,0.2)' : GOLD,
        boxShadow: disabled ? 'none' : '0 0 30px rgba(200,150,44,0.3)',
      }}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
      ) : (
        children
      )}
    </motion.button>
  );
}

// ─── Gold Checkbox Row ───────────────────────────────────────────────────────
function GoldCheckbox({ id, checked, onCheckedChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer bg-[#0D0D0D] border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all select-none group">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="w-5 h-5 border-2 border-white/20 mt-0.5 shrink-0 data-[state=checked]:bg-[#C8962C] data-[state=checked]:border-[#C8962C]"
      />
      <div className="flex-1 min-w-0">
        <Label
          htmlFor={id}
          className="text-sm font-bold cursor-pointer leading-snug text-white/80 group-hover:text-white transition-colors"
        >
          {label}
        </Label>
        {description && (
          <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </label>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OnboardingGate() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { session, profile, isLoading, completeOnboarding } = useBootGuard();

  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    try {
      return localStorage.getItem(AGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [gpsConsent, setGpsConsent] = useState(false);

  // Step 4 — profile
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinPhase, setPinPhase] = useState('enter');
  const [saving, setSaving] = useState(false);

  // Step 5 — photo
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  // Wait for BootGuard to finish loading
  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      navigate('/auth', { replace: true });
      return;
    }

    if (profile?.onboarding_complete && profile?.community_attested_at) {
      navigate('/', { replace: true });
      return;
    }

    if (profile?.onboarding_complete && !profile?.community_attested_at) {
      setStep(6);
      return;
    }

    setStep(ageConfirmed ? 2 : 1);
  }, [isLoading, session, profile?.onboarding_complete, ageConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step advance ──────────────────────────────────────────────────────────
  const handleNext = useCallback(
    async () => {
      if (step === 1 && !ageConfirmed) return;
      if (step === 2 && !termsAgreed) return;
      if (step === 3 && !dataConsent) return;

      // Step 3: persist consent flags
      if (step === 3 && session?.user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            has_agreed_terms: termsAgreed,
            has_consented_data: dataConsent,
            has_consented_gps: gpsConsent,
          })
          .eq('id', session.user.id);
        if (error) {
          console.error('[Onboarding] Failed to save consent flags:', error);
          toast.error('Could not save your consent settings. Please try again.');
          return;
        }
      }
      setStep((s) => s + 1);
    },
    [step, ageConfirmed, termsAgreed, dataConsent, gpsConsent, session?.user?.id],
  );

  // ── Step 4: saves name + PIN ──────────────────────────────────────────────
  const handleSaveProfile = useCallback(async () => {
    if (!displayName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (pin.length !== 4) {
      toast.error('PIN must be 4 digits');
      return;
    }
    if (pin !== pinConfirm) {
      toast.error("PINs don't match");
      return;
    }

    setSaving(true);
    try {
      const hash = await hashPin(pin);

      if (session?.user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ pin_code_hash: hash, display_name: displayName.trim() })
          .eq('id', session.user.id);
        if (error) {
          console.error('[Onboarding] Failed to save profile:', error);
          toast.error('Could not save your profile. Please try again.');
          return;
        }
      }

      setStep(5);
    } catch (err) {
      console.error('Profile save error:', err);
      toast.error('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [displayName, pin, pinConfirm, session?.user?.id]);

  // ── Step 5: photo upload ──────────────────────────────────────────────────
  const handlePhotoUpload = async (file) => {
    setPhotoUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const ext = file.name.split('.').pop();
      const path = `profile-photos/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('uploads').getPublicUrl(path);

      await supabase.from('profile_photos').insert({
        profile_id: user.id,
        url: publicUrl,
        position: 0,
        is_primary: true,
      });

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      setPhotoUrl(publicUrl);
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleFinish = useCallback(() => setStep(6), []);

  // ── Step 6: community attestation ─────────────────────────────────────────
  const handleCommunityConfirm = useCallback(async () => {
    setSaving(true);
    try {
      try {
        localStorage.setItem('hm_community_attested_v1', 'true');
      } catch {}

      if (session?.user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ community_attested_at: new Date().toISOString() })
          .eq('id', session.user.id);
        if (error) {
          console.warn('Community attestation DB update failed (continuing):', error);
        }

        await completeOnboarding().catch((e) => {
          console.warn('completeOnboarding failed (continuing):', e);
        });
      }

      navigate('/');
    } catch (err) {
      console.error('Community confirm error:', err);
      navigate('/');
    } finally {
      setSaving(false);
    }
  }, [session?.user?.id, completeOnboarding, navigate]);

  // ── Render Steps ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── Loading ──────────────────────────────────────────────────────────
      case 0:
        return (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="relative w-10 h-10">
              <div
                className="absolute inset-0 rounded-full border-2 border-[#C8962C]/30"
                style={{ animation: 'goldPulse 1.4s ease-in-out infinite' }}
              />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C8962C] animate-spin" />
            </div>
            <p className="text-[9px] uppercase tracking-[0.4em] text-white/15 font-medium">
              Loading
            </p>
          </div>
        );

      // ── Step 1: Age ──────────────────────────────────────────────────────
      case 1:
        return (
          <motion.div key="step-1" {...fadeSlide} className="text-center">
            {/* Icon with glow */}
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, rgba(200,150,44,0.15) 0%, transparent 70%)`,
                  filter: 'blur(8px)',
                  transform: 'scale(2)',
                }}
              />
              <div className="relative w-full h-full flex items-center justify-center">
                <Shield
                  className="w-10 h-10"
                  style={{ color: GOLD, filter: 'drop-shadow(0 0 10px rgba(200,150,44,0.4))' }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-2">Verify Your Age</h2>
            <p className="text-sm text-white/40 mb-2">
              HOTMESS is an 18+ private members club for men.
            </p>
            <p className="text-[10px] text-white/25 mb-8 leading-relaxed">
              Operating under Equality Act 2010 {'\u00A7'}193.
            </p>

            <div className="mb-6">
              <GoldCheckbox
                id="age-confirm"
                checked={ageConfirmed}
                onCheckedChange={(v) => {
                  setAgeConfirmed(!!v);
                  if (v) {
                    try {
                      localStorage.setItem(AGE_KEY, 'true');
                    } catch {}
                  }
                }}
                label="I confirm I am 18 years or older and understand this is a private members club for men"
              />
            </div>

            <GoldButton onClick={handleNext} disabled={!ageConfirmed}>
              Continue
            </GoldButton>
          </motion.div>
        );

      // ── Step 2: Terms ────────────────────────────────────────────────────
      case 2:
        return (
          <motion.div key="step-2" {...fadeSlide}>
            <div className="text-center mb-6">
              <FileText
                className="w-10 h-10 mx-auto mb-4"
                style={{ color: GOLD, filter: 'drop-shadow(0 0 10px rgba(200,150,44,0.4))' }}
              />
              <h2 className="text-2xl font-black text-white mb-1">Terms & Conditions</h2>
              <p className="text-sm text-white/40">Review our community guidelines.</p>
            </div>

            {/* Scrollable terms */}
            <div className="max-h-[40vh] overflow-y-auto bg-[#0D0D0D] border border-white/8 rounded-2xl p-5 mb-6 space-y-4 scrollbar-thin">
              {[
                ['Eligibility', 'Must be 18+. No exceptions.'],
                [
                  'Conduct',
                  'No harassment, no illegal activity, no fake profiles. Be real. Be respectful.',
                ],
                [
                  'Privacy',
                  'Location data is used for beacons and Right Now features. Encrypted. Never sold.',
                ],
                ['Content', 'You own your content. We moderate violations.'],
                ['Liability', 'HOTMESS is a platform. Use common sense. Stay safe.'],
              ].map(([heading, body]) => (
                <div key={heading}>
                  <p className="text-[10px] font-black text-[#C8962C] uppercase tracking-[0.15em] mb-1">
                    {heading}
                  </p>
                  <p className="text-xs text-white/45 leading-relaxed">{body}</p>
                </div>
              ))}

              {/* GDPR notice — warm amber, not red */}
              <div className="bg-[#C8962C]/8 border border-[#C8962C]/15 rounded-xl p-4 mt-2">
                <p className="text-[10px] font-black text-[#C8962C]/80 uppercase tracking-[0.15em] mb-1">
                  GDPR Notice
                </p>
                <p className="text-xs text-white/45 leading-relaxed">
                  Sexual orientation data is Special Category data under GDPR Article 9 and
                  receives enhanced protection. We process this data only with your explicit consent.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <GoldCheckbox
                id="terms-agree"
                checked={termsAgreed}
                onCheckedChange={setTermsAgreed}
                label="I agree to the Terms & Conditions"
              />
            </div>

            <GoldButton onClick={handleNext} disabled={!termsAgreed}>
              Continue
            </GoldButton>
          </motion.div>
        );

      // ── Step 3: Permissions ──────────────────────────────────────────────
      case 3:
        return (
          <motion.div key="step-3" {...fadeSlide}>
            <div className="text-center mb-6">
              <MapPin
                className="w-10 h-10 mx-auto mb-4"
                style={{ color: GOLD, filter: 'drop-shadow(0 0 10px rgba(200,150,44,0.4))' }}
              />
              <h2 className="text-2xl font-black text-white mb-1">Permissions</h2>
              <p className="text-sm text-white/40">We need your consent for full functionality.</p>
            </div>

            <div className="space-y-3 mb-8">
              {/* Data processing card */}
              <label className="flex items-start gap-4 bg-[#0D0D0D] border border-white/8 rounded-xl p-4 cursor-pointer hover:border-white/15 transition-all select-none group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                    Data Processing
                    <span className="text-[#C8962C] ml-1 text-xs">Required</span>
                  </p>
                  <p className="text-xs text-white/35 mt-1 leading-relaxed">
                    Anonymous usage data to improve your experience.
                  </p>
                </div>
                <Checkbox
                  checked={dataConsent}
                  onCheckedChange={setDataConsent}
                  className="w-5 h-5 border-2 border-white/20 mt-0.5 shrink-0 data-[state=checked]:bg-[#C8962C] data-[state=checked]:border-[#C8962C]"
                />
              </label>

              {/* GPS card */}
              <label className="flex items-start gap-4 bg-[#0D0D0D] border border-white/8 rounded-xl p-4 cursor-pointer hover:border-white/15 transition-all select-none group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                    Location Access
                  </p>
                  <p className="text-xs text-white/35 mt-1 leading-relaxed">
                    Enables proximity features, beacons, and safety alerts.
                  </p>
                </div>
                <Checkbox
                  checked={gpsConsent}
                  onCheckedChange={setGpsConsent}
                  className="w-5 h-5 border-2 border-white/20 mt-0.5 shrink-0 data-[state=checked]:bg-[#C8962C] data-[state=checked]:border-[#C8962C]"
                />
              </label>
            </div>

            <GoldButton onClick={handleNext} disabled={!dataConsent}>
              Continue
            </GoldButton>
          </motion.div>
        );

      // ── Step 4: Name + PIN ───────────────────────────────────────────────
      case 4:
        return (
          <motion.div key="step-4" {...fadeSlide}>
            <div className="text-center mb-6">
              <KeyRound
                className="w-10 h-10 mx-auto mb-4"
                style={{ color: GOLD, filter: 'drop-shadow(0 0 10px rgba(200,150,44,0.4))' }}
              />
              <h2 className="text-2xl font-black text-white mb-1">Your Identity</h2>
              <p className="text-sm text-white/40">Set your name and a 4-digit security PIN.</p>
            </div>

            {/* Display name input */}
            <div className="mb-6">
              <label className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-black block mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={40}
                className="w-full h-12 rounded-xl bg-[#0D0D0D] border border-white/10 px-4 text-white placeholder-white/15 focus:outline-none focus:border-[#C8962C]/50 focus:ring-1 focus:ring-[#C8962C]/20 transition-all text-sm"
              />
            </div>

            {/* PIN phases */}
            <AnimatePresence mode="wait">
              {pinPhase === 'enter' ? (
                <motion.div key="pin-enter" {...fadeSlide}>
                  <PinInput value={pin} onChange={setPin} label="Set your PIN" />
                  <div className="mt-6">
                    <GoldButton
                      onClick={() => {
                        if (pin.length === 4) setPinPhase('confirm');
                      }}
                      disabled={pin.length !== 4 || !displayName.trim()}
                    >
                      Next
                    </GoldButton>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="pin-confirm" {...fadeSlide}>
                  <PinInput
                    value={pinConfirm}
                    onChange={setPinConfirm}
                    label="Confirm your PIN"
                  />
                  {pinConfirm.length === 4 && pinConfirm !== pin && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C8962C] mt-3 text-center"
                    >
                      PINs don&apos;t match — try again
                    </motion.p>
                  )}
                  <div className="mt-6">
                    <GoldButton
                      onClick={handleSaveProfile}
                      disabled={pinConfirm.length !== 4 || pinConfirm !== pin || saving}
                      loading={saving}
                    >
                      Continue
                    </GoldButton>
                  </div>
                  <button
                    onClick={() => {
                      setPinConfirm('');
                      setPinPhase('enter');
                    }}
                    className="block mx-auto text-xs text-white/20 mt-3 hover:text-white/50 transition-colors"
                  >
                    Change PIN
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );

      // ── Step 5: Photo ────────────────────────────────────────────────────
      case 5:
        return (
          <motion.div key="step-5" {...fadeSlide} className="text-center">
            <Camera
              className="w-10 h-10 mx-auto mb-4"
              style={{ color: GOLD, filter: 'drop-shadow(0 0 10px rgba(200,150,44,0.4))' }}
            />
            <h2 className="text-2xl font-black text-white mb-1">Add a Photo</h2>
            <p className="text-sm text-white/40 mb-8">Show the real you. Add more later.</p>

            {/* Circular photo upload zone */}
            <div className="flex justify-center mb-8">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="relative w-36 h-36 rounded-full overflow-hidden flex items-center justify-center active:scale-95 transition-all"
                style={{
                  border: photoUrl
                    ? `3px solid ${GOLD}`
                    : '2px dashed rgba(200,150,44,0.3)',
                  background: photoUrl ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                {photoUrl ? (
                  <>
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : photoUploading ? (
                  <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-white/20" />
                    <span className="text-white/20 text-[10px] uppercase tracking-[0.15em] font-bold">
                      Tap to add
                    </span>
                  </div>
                )}
              </motion.button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                  e.target.value = '';
                }}
              />
            </div>

            <p className="text-[10px] text-white/15 uppercase tracking-[0.15em] mb-6">
              Visible to members only
            </p>

            <GoldButton onClick={handleFinish} disabled={photoUploading}>
              Continue
            </GoldButton>

            {!photoUrl && (
              <button
                onClick={handleFinish}
                className="block mx-auto text-white/20 text-xs mt-3 hover:text-white/50 transition-colors"
              >
                Skip for now
              </button>
            )}
          </motion.div>
        );

      // ── Step 6: Community Attestation ────────────────────────────────────
      case 6:
        return (
          <motion.div key="step-6" {...fadeSlide} className="text-center relative overflow-hidden">
            {/* Ambient gold glow */}
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(200,150,44,0.15) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, ...springSmooth }}
              className="relative z-10 mb-2"
            >
              <p className="text-5xl font-black italic tracking-tight text-white leading-none">
                HOT<span className="text-[#C8962C]">MESS</span>
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-[10px] tracking-[0.4em] text-[#C8962C]/50 uppercase font-black mb-8 relative z-10"
            >
              Private Members Club
            </motion.p>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl font-black text-white mb-2 relative z-10"
            >
              You&apos;re In
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-white/35 text-xs mb-6 relative z-10"
            >
              One last thing before you enter.
            </motion.p>

            {/* Community pledge card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="bg-[#0D0D0D] border border-[#C8962C]/15 rounded-2xl p-5 mb-6 text-left relative z-10"
            >
              <p className="text-sm text-white/70 leading-relaxed">
                HOTMESS is a private members club for gay and bisexual men, 18+.
              </p>
              <p className="text-sm text-white/40 leading-relaxed mt-3">
                By continuing, you confirm you&apos;re entering this space as such and consent
                to the processing of Special Category data under GDPR Article 9.
              </p>
              <p className="text-[10px] text-white/20 leading-relaxed mt-3">
                Operating under Equality Act 2010 {'\u00A7'}193.
              </p>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.4 }}
              className="relative z-10"
            >
              <GoldButton onClick={handleCommunityConfirm} disabled={saving} loading={saving}>
                <Check className="w-5 h-5" />
                Join HOTMESS
              </GoldButton>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              onClick={() => {
                window.location.href = 'https://www.google.com';
              }}
              className="text-white/15 text-xs mt-3 hover:text-white/30 transition-colors relative z-10"
            >
              This isn&apos;t for me
            </motion.button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="text-center mb-6">
          <p className="text-3xl font-black italic tracking-tight text-white leading-none">
            HOT<span className="text-[#C8962C]">MESS</span>
          </p>
        </div>

        {/* Gold progress bar */}
        {step >= 1 && step <= 6 && <ProgressBar current={step} total={TOTAL_STEPS} />}

        {/* Step card */}
        <div className="bg-[#1C1C1E] border border-white/8 rounded-3xl p-6">
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>
      </motion.div>

      {/* Pulse animation for loading spinner */}
      <style>{`
        @keyframes goldPulse {
          0%, 100% { transform: scale(0.88); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
