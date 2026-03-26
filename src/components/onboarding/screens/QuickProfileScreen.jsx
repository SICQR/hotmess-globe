/**
 * QuickProfileScreen — Display name, photo upload, terms agreement.
 * Writes to profiles + gdpr_consents + storage/avatars.
 */
import React, { useState, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { Loader2, Camera } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';
import OnboardingBackButton from '../OnboardingBackButton';

const GOLD = '#C8962C';

export default function QuickProfileScreen({ session, onComplete, onBack }) {
  const [displayName, setDisplayName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const canContinue = displayName.trim().length > 0 && termsAccepted;

  const handleSubmit = async () => {
    if (!canContinue || !userId) return;
    setLoading(true);
    setError('');

    try {
      // Upload photo if provided
      let avatarUrl = null;
      if (photoFile) {
        try {
          avatarUrl = await uploadToStorage(photoFile, 'avatars', userId);
        } catch (uploadErr) {
          console.warn('[QuickProfile] avatar upload failed:', uploadErr);
        }
      }

      // Update profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          consent_accepted: true,
          has_agreed_terms: true,
          onboarding_stage: 'vibe',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileErr) {
        throw profileErr;
      }

      // Write GDPR consent record
      await supabase.from('gdpr_consents').insert({
        user_email: userEmail,
        consent_type: 'terms_of_service',
        granted: true,
        granted_at: new Date().toISOString(),
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      onComplete();
    } catch (err) {
      console.error('[QuickProfile] error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 overflow-y-auto">
      <OnboardingBackButton onBack={onBack} />
      <div className="w-full max-w-xs py-12">
        <ProgressDots current={3} total={5} />

        <h2 className="text-white text-xl font-bold mb-8">Set up your profile</h2>

        {/* Photo upload */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden"
            style={{ borderColor: photoPreview ? GOLD : '#333' }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-white/30" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>
        <p className="text-center text-white/30 text-xs mb-8">
          {photoPreview ? 'Tap to change' : 'Add a photo (optional)'}
        </p>

        {/* Display name */}
        <div className="mb-6">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
            placeholder="Display name"
            maxLength={30}
            className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
            style={{ borderBottomColor: displayName ? GOLD : '#333' }}
            autoComplete="off"
          />
          <p className="text-white/20 text-xs mt-1 text-right">{displayName.length}/30</p>
        </div>

        {/* Terms checkbox */}
        <label className="flex items-start gap-3 mb-10 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-[#333] accent-[#C8962C] bg-black"
          />
          <span className="text-white/70 text-sm leading-tight">
            I agree to the{' '}
            <a href="/legal/terms" target="_blank" rel="noopener" className="underline" style={{ color: GOLD }}>
              Hotmess terms of use
            </a>{' '}
            and community rules
          </span>
        </label>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!canContinue || loading}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
          style={{
            backgroundColor: GOLD,
            opacity: canContinue && !loading ? 1 : 0.3,
          }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Next'}
        </button>

        {error && (
          <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
