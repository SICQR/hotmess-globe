/**
 * QuickSetupScreen — Avatar upload, display name, location toggle.
 *
 * Replaces QuickProfile + Vibe + Safety + Location in the new 3-step flow.
 * Single screen, one "Let's go" button. No terms gate — covered by GDPR consent insert.
 *
 * Writes:
 *   profiles.upsert — display_name, avatar_url, has_consented_gps, onboarding_completed, onboarding_stage
 *   gdpr_consents.insert — consent_type 'onboarding_v2'
 *   presence.upsert — if location enabled
 */
import React, { useState, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { Loader2, Camera, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import OnboardingBackButton from '../OnboardingBackButton';

const GOLD = '#C8962C';

export default function QuickSetupScreen({ session, onComplete, onBack }) {
  const [displayName, setDisplayName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const canContinue = displayName.trim().length > 0 && !loading;

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

  const handleSubmit = async () => {
    if (!canContinue || !userId) return;
    setLoading(true);
    setError('');

    try {
      // 1. Upload avatar if provided
      let avatarUrl = null;
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          avatarUrl = await uploadToStorage(photoFile, 'avatars', userId);
        } catch (uploadErr) {
          console.warn('[QuickSetup] avatar upload failed:', uploadErr);
        } finally {
          setUploadingPhoto(false);
        }
      }

      // 2. Get location if toggled on
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

      // 3. Upsert profile
      await supabase.from('profiles').upsert(
        {
          id: userId,
          display_name: displayName.trim(),
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          has_consented_gps: locationEnabled,
          consent_accepted: true,
          has_agreed_terms: true,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          community_attested_at: new Date().toISOString(),
          onboarding_stage: 'complete',
          is_online: true,
          is_visible: true,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(coords
            ? {
                last_lat: coords.coords.latitude,
                last_lng: coords.coords.longitude,
                last_loc_ts: new Date().toISOString(),
                loc_accuracy_m: Math.round(coords.coords.accuracy),
                consent_location: true,
                location_opt_in: true,
              }
            : {}),
        },
        { onConflict: 'id' }
      );

      // 4. Insert GDPR consent
      await supabase.from('gdpr_consents').insert({
        user_id: userId,
        user_email: userEmail,
        consent_type: 'onboarding_v2',
        consented_at: new Date().toISOString(),
      });

      // 5. Write presence if location enabled
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

      // 6. Set localStorage for BootGuard fallbacks
      try {
        localStorage.setItem('hm_age_confirmed_v1', 'true');
        localStorage.setItem('hm_community_attested_v1', 'true');
      } catch {
        // localStorage unavailable
      }

      onComplete();
    } catch (err) {
      console.error('[QuickSetup] error:', err);
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 overflow-y-auto">
      <OnboardingBackButton onBack={onBack} />
      <div className="w-full max-w-xs py-12">
        <h2 className="text-white text-xl font-bold mb-8">{"You're almost in."}</h2>

        {/* Avatar upload */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden"
            style={{ borderColor: photoPreview ? GOLD : '#333' }}
            aria-label="Upload profile photo"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-white/30" />
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
          </button>
          <p className="text-center text-white/30 text-xs mt-2">
            {photoPreview ? 'Tap to change' : 'Add a photo (optional)'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Display name */}
        <div className="mb-6">
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

        {/* Location toggle */}
        <div className="flex items-center justify-between mb-10 py-3">
          <div className="flex items-center gap-2">
            <MapPin
              className="w-4 h-4 flex-shrink-0"
              style={{ color: locationEnabled ? GOLD : '#555' }}
            />
            <span className="text-white/60 text-sm leading-tight">
              Share my location to see who's nearby
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
