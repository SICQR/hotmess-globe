import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, FileText, MapPin, KeyRound, Camera, Check, Loader2 } from 'lucide-react';
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
  { id: 1, icon: Shield,   color: '#C8962C', label: 'Age'         },
  { id: 2, icon: FileText, color: '#00D9FF', label: 'Terms'       },
  { id: 3, icon: MapPin,   color: '#B026FF', label: 'Permissions' },
  { id: 4, icon: KeyRound, color: '#39FF14', label: 'Profile'     },
  { id: 5, icon: Camera,   color: '#C8962C', label: 'Photo'       },
  { id: 6, icon: Shield,   color: '#C8962C', label: 'Community'   },
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

  // Step 5 — photo
  const [photoUrl, setPhotoUrl]             = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef                       = useRef(null);

  // Wait for BootGuard to finish loading, then decide starting step.
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

    // Onboarding done but community gate pending — jump straight to step 6
    if (profile?.onboarding_complete && !profile?.community_attested_at) {
      setStep(6);
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
        .eq('id', session.user.id);
      if (error) {
        console.error('[Onboarding] Failed to save consent flags:', error);
        toast.error('Could not save your consent settings. Please try again.');
        return;
      }
    }
    setStep((s) => s + 1);
  }, [step, ageConfirmed, termsAgreed, dataConsent, gpsConsent, session?.user?.id]);

  // ── Step 4 save — saves name + PIN, advances to photo step ────────────────
  const handleSaveProfile = useCallback(async () => {
    if (!displayName.trim()) { toast.error('Please enter your name'); return; }
    if (pin.length !== 4)    { toast.error('PIN must be 4 digits');   return; }
    if (pin !== pinConfirm)  { toast.error("PINs don't match");       return; }

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

      // Advance to photo step
      setStep(5);
    } catch (err) {
      console.error('Profile save error:', err);
      toast.error('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [displayName, pin, pinConfirm, session?.user?.id]);

  // ── Step 5 photo upload ────────────────────────────────────────────────────
  const handlePhotoUpload = async (file) => {
    setPhotoUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const ext = file.name.split('.').pop();
      const path = `profile-photos/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);

      // Insert into profile_photos table
      await supabase.from('profile_photos').insert({
        profile_id: user.id,
        url: publicUrl,
        position: 0,
        is_primary: true,
      });

      // Also set avatar_url on the profile for quick access
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

      setPhotoUrl(publicUrl);
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  // ── Step 5 finish — advance to community attestation step ─────────────────
  const handleFinish = useCallback(() => {
    setStep(6);
  }, []);

  // ── Step 6 community attestation — confirm identity + complete onboarding ──
  const handleCommunityConfirm = useCallback(async () => {
    setSaving(true);
    try {
      // Store community attestation in localStorage as fallback
      try {
        localStorage.setItem('hm_community_attested_v1', 'true');
      } catch {}

      if (session?.user?.id) {
        // Try to update DB, but don't block on failure
        const { error } = await supabase
          .from('profiles')
          .update({ community_attested_at: new Date().toISOString() })
          .eq('id', session.user.id);
        if (error) {
          console.warn('Community attestation DB update failed (continuing):', error);
        }

        // Try to complete onboarding
        await completeOnboarding().catch(e => {
          console.warn('completeOnboarding failed (continuing):', e);
        });
      }
      
      // Always navigate home - localStorage attestation allows entry
      navigate('/');
    } catch (err) {
      console.error('Community confirm error:', err);
      // Even on error, let user through if localStorage is set
      navigate('/');
    } finally {
      setSaving(false);
    }
  }, [session?.user?.id, completeOnboarding, navigate]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── Loading ──────────────────────────────────────────────────────────
      case 0:
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-10 h-10 border-4 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
            <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Loading…</p>
          </div>
        );

      // ── Step 1: Age ───────────────────────────────────────────────────────
      case 1:
        return (
          <motion.div key="step-1" {...fadeSlide} className="text-center">
            <Shield className="w-14 h-14 mx-auto mb-6" style={{ color: '#C8962C', filter: 'drop-shadow(0 0 12px rgba(200,150,44,0.5))' }} />
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
            <button onClick={handleNext} disabled={!ageConfirmed} className="w-full h-14 rounded-xl font-black text-black text-lg uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all" style={{ background: ageConfirmed ? '#C8962C' : 'rgba(200,150,44,0.3)', boxShadow: ageConfirmed ? '0 0 24px rgba(200,150,44,0.4)' : 'none' }}>
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
                  <p className="text-xs font-black text-[#C8962C] uppercase mb-1">{h}</p>
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
                    <p className="text-sm font-bold">{title}{required && <span className="text-[#C8962C] ml-1">*</span>}</p>
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
                    <p className="text-xs text-[#C8962C] mt-2">PINs don't match</p>
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
                      <>Next &rarr;</>
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

      // ── Step 5: Photo ─────────────────────────────────────────────────────
      case 5:
        return (
          <motion.div key="step-5" {...fadeSlide} className="text-center">
            <Camera className="w-14 h-14 mx-auto mb-6" style={{ color: '#C8962C', filter: 'drop-shadow(0 0 12px rgba(200,150,44,0.5))' }} />
            <h2 className="text-3xl font-black uppercase mb-1 tracking-wide">Add a Photo</h2>
            <p className="text-white/50 mb-6 text-sm">Show the real you. You can add more later.</p>

            {/* Photo upload */}
            <div className="flex justify-center mb-6">
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-dashed border-white/20 hover:border-[#C8962C]/50 transition-all flex items-center justify-center bg-[#1C1C1E] active:scale-95"
              >
                {photoUrl ? (
                  <>
                    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : photoUploading ? (
                  <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-white/30" />
                    <span className="text-white/30 text-xs">Tap to add</span>
                  </div>
                )}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                  e.target.value = '';
                }}
              />
            </div>

            <button
              onClick={handleFinish}
              disabled={photoUploading}
              className="w-full h-14 rounded-xl font-black text-black text-lg uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ background: '#C8962C', boxShadow: '0 0 24px rgba(200,150,44,0.4)' }}
            >
              Continue →
            </button>

            {!photoUrl && (
              <button
                onClick={handleFinish}
                className="text-white/30 text-xs mt-3 hover:text-white/60 transition-colors"
              >
                Skip for now
              </button>
            )}
          </motion.div>
        );

      // ── Step 6: Community attestation — "YOU'RE IN THE MESS NOW" ────────
      case 6:
        return (
          <motion.div key="step-6" {...fadeSlide} className="text-center relative overflow-hidden">
            {/* Ambient glow */}
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(200,150,44,0.2) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
              className="relative z-10 mb-2"
            >
              <p className="text-5xl font-black tracking-tight text-white leading-none">
                HOT<span className="text-[#C8962C]">MESS</span>
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-[10px] tracking-[0.5em] text-[#C8962C]/60 uppercase font-mono mb-6 relative z-10"
            >
              LONDON
            </motion.p>

            {/* Main headline */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-2xl font-black uppercase mb-2 tracking-wide relative z-10"
            >
              Your Community
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-white/40 text-xs mb-6 relative z-10"
            >
              One last thing before you're in.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="bg-white/5 border border-[#C8962C]/20 rounded-xl p-5 mb-6 text-left relative z-10"
            >
              <p className="text-sm text-white/80 leading-relaxed">
                HOTMESS is built for gay and bisexual men, 18+.
              </p>
              <p className="text-sm text-white/50 leading-relaxed mt-3">
                By continuing, you confirm you're entering this space as such.
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.4 }}
              onClick={handleCommunityConfirm}
              disabled={saving}
              className="w-full h-14 rounded-xl font-black text-black text-lg uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10"
              style={{ background: '#C8962C', boxShadow: '0 0 30px rgba(200,150,44,0.5)' }}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                <><Check className="w-5 h-5" /> I'M IN THE MESS</>
              )}
            </motion.button>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              onClick={() => { window.location.href = 'about:blank'; }}
              className="text-white/20 text-xs mt-3 hover:text-white/40 transition-colors relative z-10"
            >
              This isn't for me
            </motion.button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="text-center mb-8">
          <p className="text-4xl font-black tracking-tight text-white leading-none">
            HOT<span className="text-[#C8962C]">MESS</span>
          </p>
          <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono mt-2">LONDON</p>
        </div>

        {/* Progress dots */}
        {step >= 1 && step <= 6 && (
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
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Step label */}
        {step >= 1 && step <= 6 && (
          <p className="text-center text-[10px] text-white/20 font-mono uppercase tracking-widest mt-4">
            Step {step} of {STEPS.length} — {STEPS[step - 1]?.label}
          </p>
        )}
      </motion.div>
    </div>
  );
}
