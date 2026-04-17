/**
 * QuickSetupScreen — Name, photo, location. HOTMESS tone.
 * Name first. Photo optional and secondary. Location with clear payoff.
 */
import React, { useState, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage, insertProfilePhoto } from '@/lib/uploadToStorage';
import { Loader2, Camera, MapPin, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import OnboardingBackButton from '../OnboardingBackButton';
import { isWebAuthnSupported, isPasskeyRegistered, registerPasskey } from '@/lib/passkey';

const GOLD = '#C8962C';

export default function QuickSetupScreen({ session, onComplete, onBack }) {
  const [displayName, setDisplayName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [error, setError] = useState('');
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const fileInputRef = useRef(null);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const canContinue = displayName.trim().length > 0 && !loading;

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploaded(false);
    setError('');
    if (userId) {
      setUploadingPhoto(true);
      try {
        const url = await uploadToStorage(file, 'avatars', userId);
        setPhotoFile(url);
        setPhotoUploaded(true);
        await insertProfilePhoto(userId, url, 0, true).catch(() => {});
      } catch (err) {
        console.warn('[QuickSetup] avatar upload failed:', err);
        setError('Photo upload failed — you can retry or continue without');
        setPhotoFile(file);
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!canContinue || !userId) return;
    setLoading(true);
    setError('');

    try {
      let avatarUrl = null;
      if (typeof photoFile === 'string') {
        avatarUrl = photoFile;
      } else if (photoFile instanceof File) {
        setUploadingPhoto(true);
        try {
          avatarUrl = await uploadToStorage(photoFile, 'avatars', userId);
          setPhotoUploaded(true);
          await insertProfilePhoto(userId, avatarUrl, 0, true).catch(() => {});
        } catch (uploadErr) {
          console.warn('[QuickSetup] avatar upload failed:', uploadErr);
        } finally {
          setUploadingPhoto(false);
        }
      }

      let coords = null;
      if (locationEnabled) {
        try {
          coords = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });
        } catch {
          // Location denied — continue without it
        }
      }

      await supabase.from('profiles').upsert(
        {
          id: userId,
          display_name: displayName.trim(),
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          has_consented_gps: locationEnabled,
          consent_accepted: true,
          has_agreed_terms: true,
          onboarding_stage: 'quick_setup',
          community_attested_at: new Date().toISOString(),
          is_online: true,
          is_visible: true,
          updated_at: new Date().toISOString(),
          ...(coords ? { last_loc_ts: new Date().toISOString() } : {}),
        },
        { onConflict: 'id' }
      );

      await supabase.from('gdpr_consents').insert({
        user_email: userEmail,
        consent_type: 'onboarding_v2',
        granted: true,
        granted_at: new Date().toISOString(),
      });

      if (coords) {
        await supabase.from('user_presence').upsert(
          {
            user_id: userId,
            status: 'online',
            last_seen_at: new Date().toISOString(),
            location: `POINT(${coords.coords.longitude} ${coords.coords.latitude})`,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            metadata: { source: 'onboarding' },
          },
          { onConflict: 'user_id' }
        );
      }

      try {
        localStorage.setItem('hm_age_confirmed_v1', 'true');
        localStorage.setItem('hm_community_attested_v1', 'true');
        localStorage.setItem('hm_last_display_name', displayName.trim());
      } catch {}

      if (isWebAuthnSupported() && !isPasskeyRegistered()) {
        setShowPasskeyPrompt(true);
      } else {
        onComplete();
      }
    } catch (err) {
      console.error('[QuickSetup] error:', err);
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePasskey = async () => {
    setRegisteringPasskey(true);
    await registerPasskey();
    setRegisteringPasskey(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 overflow-y-auto">
      {/* Face ID / Passkey prompt — shown after profile save */}
      {showPasskeyPrompt && (
        <div
          className="fixed inset-0 flex items-center justify-center px-6 z-50"
          style={{ background: 'rgba(0,0,0,0.95)' }}
        >
          <div className="w-full max-w-xs text-center">
            <p className="text-white text-lg font-black mb-2">Back in one tap.</p>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
              Use Face ID next time. No links, no waiting.
            </p>
            <button
              onClick={handleEnablePasskey}
              disabled={registeringPasskey}
              className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase mb-3 transition-opacity"
              style={{ backgroundColor: GOLD, color: '#000', opacity: registeringPasskey ? 0.6 : 1 }}
            >
              {registeringPasskey ? 'Setting up…' : 'Enable Face ID'}
            </button>
            <button
              onClick={() => onComplete()}
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
      <OnboardingBackButton onBack={onBack} />
      <div className="w-full max-w-xs py-12">

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          {[0,1,2].map((i) => (
            <span key={i} className="text-xs" style={{ color: GOLD }}>●</span>
          ))}
        </div>

        <h2 className="text-white text-xl font-bold mb-8">Make yourself at home.</h2>

        {/* Display name — first */}
        <div className="mb-8">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
            placeholder="What do people call you?"
            maxLength={30}
            className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
            style={{ borderBottomColor: displayName ? GOLD : '#333' }}
            autoComplete="off"
            autoFocus
          />
          <p className="text-white/20 text-xs mt-1 text-right">{displayName.length}/30</p>
        </div>

        {/* Avatar upload — second, inline */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ borderColor: photoPreview ? GOLD : '#333' }}
            aria-label="Upload profile photo"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-white/30" />
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              </div>
            )}
            {photoUploaded && !uploadingPhoto && (
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: GOLD }}>
                <Check className="w-3 h-3 text-black" />
              </div>
            )}
          </button>
          <div className="flex flex-col">
            <span className="text-white/60 text-sm">
              {uploadingPhoto ? 'Uploading…' : photoUploaded ? 'Photo saved ✓' : 'Add a photo'}
            </span>
            <span className="text-white/25 text-xs mt-0.5">Optional — add one later</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Location toggle */}
        <div className="flex items-center justify-between mb-10 py-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <MapPin
              className="w-4 h-4 flex-shrink-0"
              style={{ color: locationEnabled ? GOLD : '#555' }}
            />
            <span className="text-white/60 text-sm leading-tight">
              See who's out near you tonight
            </span>
          </div>
          <button
            onClick={() => setLocationEnabled((v) => !v)}
            className="flex-shrink-0 ml-3"
            aria-label={locationEnabled ? 'Disable location sharing' : 'Enable location sharing'}
          >
            {locationEnabled ? (
              <ToggleRight className="w-8 h-8" style={{ color: GOLD }} />
            ) : (
              <ToggleLeft className="w-8 h-8 text-white/20" />
            )}
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!canContinue}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
          style={{
            backgroundColor: GOLD,
            opacity: canContinue ? 1 : 0.3,
          }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Let's go"}
        </button>

        {error && (
          <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
