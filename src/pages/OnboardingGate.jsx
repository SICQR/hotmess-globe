import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '../utils';
import { supabase } from '@/components/utils/supabaseClient';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, FileText, MapPin, KeyRound, Check } from 'lucide-react';
import BrandBackground from '@/components/ui/BrandBackground';
import { toast } from 'sonner';

const AGE_KEY = 'hm_age_confirmed_v1';

// SHA-256 hash using Web Crypto API (browser-native, no dependency)
async function hashPin(pin) {
  const encoded = new TextEncoder().encode(pin);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const STEPS = [
  { id: 1, icon: Shield,   color: '#FF1493', label: 'Age'         },
  { id: 2, icon: FileText, color: '#00D9FF', label: 'Terms'       },
  { id: 3, icon: MapPin,   color: '#B026FF', label: 'Permissions' },
  { id: 4, icon: KeyRound, color: '#39FF14', label: 'Profile'     },
];

const fadeSlide = {
  initial:  { opacity: 0, x: 20  },
  animate:  { opacity: 1, x: 0   },
  exit:     { opacity: 0, x: -20 },
  transition: { duration: 0.3 },
};

// ─── PIN keypad ──────────────────────────────────────────────────────────────
function PinInput({ value, onChange, label }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/40 uppercase tracking-widest font-mono">{label}</p>
      {/* Display dots */}
      <div className="flex gap-3 justify-center mb-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full border-2 transition-all"
            style={{
              borderColor: value.length > i ? '#39FF14' : 'rgba(255,255,255,0.2)',
              background:  value.length > i ? '#39FF14' : 'transparent',
            }}
          />
        ))}
      </div>
      {/* Number grid */}
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => value.length < 4 && onChange(value + n)}
            className="h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 active:scale-95 transition-all"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => value.length < 4 && onChange(value + '0')}
          className="h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 active:scale-95 transition-all"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          className="h-12 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xl hover:bg-white/10 active:scale-95 transition-all"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingGate() {
  const [step, setStep]                     = useState(0);
  const navigate                            = useNavigate();
  const { session, profile, isLoading, completeOnboarding } = useBootGuard();

  const [ageConfirmed, setAgeConfirmed]     = useState(() => {
    try { return localStorage.getItem(AGE_KEY) === 'true'; } catch { return false; }
  });
  const [termsAgreed, setTermsAgreed]       = useState(false);
  const [dataConsent, setDataConsent]       = useState(false);
  const [gpsConsent, setGpsConsent]         = useState(false);

  // Step 4 — profile
  const [displayName, setDisplayName]       = useState('');
  const [pin, setPin]                       = useState('');
  const [pinConfirm, setPinConfirm]         = useState('');
  const [pinPhase, setPinPhase]             = useState('enter'); // 'enter' | 'confirm'
  const [saving, setSaving]                 = useState(false);

  // Wait for BootGuard to finish loading, then decide starting step.
  // - No session → send to /auth (should not normally happen since BootRouter gates this)
  // - Onboarding already complete → send straight to app
  // - Otherwise → start at step 1 (age) or step 2 (terms) depending on localStorage
  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      navigate('/auth', { replace: true });
      return;
    }

    if (profile?.onboarding_complete) {
      navigate(createPageUrl('Home'), { replace: true });
      return;
    }

    // Age already confirmed in localStorage → skip age step
    setStep(ageConfirmed ? 2 : 1);
  }, [isLoading, session, profile?.onboarding_complete, ageConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step advance ───────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (step === 1 && !ageConfirmed) return;
    if (step === 2 && !termsAgreed)  return;
    if (step === 3 && !dataConsent)  return;

    // Step 3: persist consent flags to the profiles table
    if (step === 3 && session?.user?.id) {
      const { error } = await supabase
        .from('profiles')
        .update({
          has_agreed_terms:   termsAgreed,
          has_consented_data: dataConsent,
          has_consented_gps:  gpsConsent,
        })
        .eq('account_id', session.user.id);
      if (error) {
        console.error('[Onboarding] Failed to save consent flags:', error);
        toast.error('Could not save your consent settings. Please try again.');
        return;
      }
    }
    setStep((s) => s + 1);
  }, [step, ageConfirmed, termsAgreed, dataConsent, gpsConsent, session?.user?.id]);

  // ── Step 4 save ────────────────────────────────────────────────────────────
  const handleSaveProfile = useCallback(async () => {
    if (!displayName.trim()) { toast.error('Please enter your name'); return; }
    if (pin.length !== 4)    { toast.error('PIN must be 4 digits');   return; }
    if (pin !== pinConfirm)  { toast.error('PINs don\'t match');      return; }

    setSaving(true);
    try {
      const hash = await hashPin(pin);

      // Save display name + PIN hash to profiles table (single upsert)
      if (session?.user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ pin_code_hash: hash, display_name: displayName.trim() })
          .eq('account_id', session.user.id);
        if (error) {
          console.error('[Onboarding] Failed to save profile:', error);
          toast.error('Could not save your profile. Please try again.');
          return;
        }
      }

      await completeOnboarding();
      navigate(createPageUrl('Home'));
    } catch (err) {
      console.error('Profile save error:', err);
      toast.error('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [displayName, pin, pinConfirm, session?.user?.id, completeOnboarding, navigate]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const stepColor = STEPS[step - 1]?.color ?? '#FF1493';

  const renderStep = () => {
    switch (step) {
      // ── Loading ──────────────────────────────────────────────────────────
      case 0:
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-10 h-10 border-4 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" />
            <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Loading…</p>
          </div>
        );

      // ── Step 1: Age ───────────────────────────────────────────────────────
      case 1:
        return (
          <motion.div key="step-1" {...fadeSlide} className="text-center">
            <Shield className="w-14 h-14 mx-auto mb-6" style={{ color: '#FF1493', filter: 'drop-shadow(0 0 12px rgba(255,20,147,0.6))' }} />
            <h2 className="text-3xl font-black uppercase mb-3 tracking-wide">Age Verification</h2>
            <p className="text-white/50 mb-8 text-sm">You must be 18+ to use HOTMESS.</p>
            <label className="flex items-center justify-center gap-3 cursor-pointer mb-8 select-none">
              <Checkbox
                id="age-confirm"
                checked={ageConfirmed}
                onCheckedChange={(v) => {
                  setAgeConfirmed(!!v);
                  if (v) { try { localStorage.setItem(AGE_KEY, 'true'); } catch {} }
                }}
                className="w-5 h-5 border-2 border-white/30"
              />
              <Label htmlFor="age-confirm" className="text-base font-semibold cursor-pointer">
                I am 18 years or older
              </Label>
            </label>
            <button onClick={handleNext} disabled={!ageConfirmed} className="w-full h-14 rounded-xl font-black text-black text-lg uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all" style={{ background: ageConfirmed ? '#FF1493' : 'rgba(255,20,147,0.3)', boxShadow: ageConfirmed ? '0 0 24px rgba(255,20,147,0.4)' : 'none' }}>
              Continue
            </button>
          </motion.div>
        );

      // ── Step 2: Terms ─────────────────────────────────────────────────────
      case 2:
        return (
          <motion.div key="step-2" {...fadeSlide} className="text-center">
            <FileText className="w-14 h-14 mx-auto mb-6" style={{ color: '#00D9FF', filter: 'drop-shadow(0 0 12px rgba(0,217,255,0.5))' }} />
            <h2 className="text-3xl font-black uppercase mb-3 tracking-wide">Terms & Conditions</h2>
            <div className="max-h-56 overflow-y-auto bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
              {[['Eligibility','Must be 18+. No exceptions.'],['Conduct','No harassment, no illegal activity, no fake profiles. Be real. Be respectful.'],['Privacy','Location data is used for beacons and Right Now features. Encrypted. Never sold.'],['Content','You own your content. We moderate violations.'],['Liability','HOTMESS is a platform. Use common sense. Stay safe.']].map(([h,b]) => (
                <div key={h}>
                  <p className="text-xs font-black text-[#FF1493] uppercase mb-1">{h}</p>
                  <p className="text-xs text-white/50 leading-relaxed">{b}</p>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-3 cursor-pointer mb-6 text-left select-none">
              <Checkbox id="terms-agree" checked={termsAgreed} onCheckedChange={setTermsAgreed} className="w-5 h-5 border-2 border-white/30 shrink-0" />
              <Label htmlFor="terms-agree" className="text-sm font-semibold cursor-pointer leading-snug">I agree to the Terms & Conditions</Label>
            </label>
            <button onClick={handleNext} disabled={!termsAgreed} className="w-full h-14 rounded-xl font-black text-black text-lg uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all" style={{ background: termsAgreed ? '#00D9FF' : 'rgba(0,217,255,0.3)', boxShadow: termsAgreed ? '0 0 24px rgba(0,217,255,0.4)' : 'none' }}>
              Continue
            </button>
          </motion.div>
        );

      // ── Step 3: Permissions ───────────────────────────────────────────────
      case 3:
        return (
          <motion.div key="step-3" {...fadeSlide} className="text-center">
            <MapPin className="w-14 h-14 mx-auto mb-6" style={{ color: '#B026FF', filter: 'drop-shadow(0 0 12px rgba(176,38,255,0.5))' }} />
            <h2 className="text-3xl font-black uppercase mb-3 tracking-wide">Permissions</h2>
            <p className="text-white/50 mb-6 text-sm">We need your consent for full functionality.</p>
            <div className="space-y-3 mb-8 text-left">
              {[
                { id: 'data', checked: dataConsent, onChange: setDataConsent, title: 'Data Collection', desc: 'Anonymous usage data to improve your experience', required: true },
                { id: 'gps',  checked: gpsConsent,  onChange: setGpsConsent,  title: 'GPS Access',       desc: 'Required for beacons, Right Now, and local features', required: false },
              ].map(({ id, checked, onChange, title, desc, required }) => (
                <label key={id} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors select-none">
                  <Checkbox id={id} checked={checked} onCheckedChange={onChange} className="w-5 h-5 border-2 border-white/30 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{title}{required && <span className="text-[#FF1493] ml-1">*</span>}</p>
                    <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={handleNext} disabled={!dataConsent} className="w-full h-14 rounded-xl font-black text-white text-lg uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all" style={{ background: dataConsent ? '#B026FF' : 'rgba(176,38,255,0.3)', boxShadow: dataConsent ? '0 0 24px rgba(176,38,255,0.4)' : 'none' }}>
              Continue
            </button>
          </motion.div>
        );

      // ── Step 4: Name + PIN ────────────────────────────────────────────────
      case 4:
        return (
          <motion.div key="step-4" {...fadeSlide} className="text-center">
            <KeyRound className="w-14 h-14 mx-auto mb-6" style={{ color: '#39FF14', filter: 'drop-shadow(0 0 12px rgba(57,255,20,0.5))' }} />
            <h2 className="text-3xl font-black uppercase mb-1 tracking-wide">Your Identity</h2>
            <p className="text-white/50 mb-6 text-sm">Set your name and a 4-digit PIN to protect your profile.</p>

            {/* Name */}
            <div className="mb-6 text-left">
              <label className="text-xs text-white/40 uppercase tracking-widest font-mono block mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                maxLength={40}
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-white placeholder-white/20 focus:outline-none focus:border-[#39FF14]/50 transition-colors"
              />
            </div>

            {/* PIN phases */}
            <AnimatePresence mode="wait">
              {pinPhase === 'enter' ? (
                <motion.div key="pin-enter" {...fadeSlide}>
                  <PinInput value={pin} onChange={setPin} label="Set your PIN" />
                  <button
                    onClick={() => { if (pin.length === 4) setPinPhase('confirm'); }}
                    disabled={pin.length !== 4 || !displayName.trim()}
                    className="w-full h-14 rounded-xl font-black text-black text-lg uppercase tracking-widest mt-6 disabled:opacity-40 active:scale-95 transition-all"
                    style={{ background: (pin.length === 4 && displayName.trim()) ? '#39FF14' : 'rgba(57,255,20,0.3)', boxShadow: (pin.length === 4 && displayName.trim()) ? '0 0 24px rgba(57,255,20,0.4)' : 'none' }}
                  >
                    Next
                  </button>
                </motion.div>
              ) : (
                <motion.div key="pin-confirm" {...fadeSlide}>
                  <PinInput value={pinConfirm} onChange={setPinConfirm} label="Confirm your PIN" />
                  {pinConfirm.length === 4 && pinConfirm !== pin && (
                    <p className="text-xs text-[#FF1493] mt-2">PINs don't match</p>
                  )}
                  <button
                    onClick={handleSaveProfile}
                    disabled={pinConfirm.length !== 4 || pinConfirm !== pin || saving}
                    className="w-full h-14 rounded-xl font-black text-black text-lg uppercase tracking-widest mt-6 disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
                    style={{ background: (pinConfirm === pin && pinConfirm.length === 4) ? '#39FF14' : 'rgba(57,255,20,0.3)', boxShadow: (pinConfirm === pin && pinConfirm.length === 4) ? '0 0 24px rgba(57,255,20,0.4)' : 'none' }}
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    ) : (
                      <><Check className="w-5 h-5" /> Enter HOTMESS</>
                    )}
                  </button>
                  <button onClick={() => { setPinConfirm(''); setPinPhase('enter'); }} className="text-xs text-white/30 mt-3 hover:text-white/60 transition-colors">
                    ← Change PIN
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );

      default:
        return null;
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden">
      <BrandBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="text-center mb-8">
          <p className="text-4xl font-black tracking-tight text-white leading-none">
            HOT<span className="text-[#FF1493]" style={{ textShadow: '0 0 24px rgba(255,20,147,0.6)' }}>MESS</span>
          </p>
          <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono mt-2">LONDON</p>
        </div>

        {/* Progress dots */}
        {step >= 1 && step <= 4 && (
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width:      s.id <= step ? '2.5rem' : '0.75rem',
                  background: s.id < step ? s.color : s.id === step ? s.color : 'rgba(255,255,255,0.15)',
                  opacity:    s.id <= step ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        )}

        {/* Step card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Step label */}
        {step >= 1 && step <= 4 && (
          <p className="text-center text-[10px] text-white/20 font-mono uppercase tracking-widest mt-4">
            Step {step} of {STEPS.length} — {STEPS[step - 1]?.label}
          </p>
        )}
      </motion.div>
    </div>
  );
}
