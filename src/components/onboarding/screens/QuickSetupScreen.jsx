/**
 * QuickSetupScreen — Name + photo + location consent + GDPR.
 *
 * 2026-06-17: name/photo capture added back (was deferred 2026-05-09).
 * Without a display_name the platform is socially broken — users can't
 * know who Boo'd them. Name is required; avatar is optional but surfaced
 * here because first impression matters and drop-off after onboarding is high.
 *
 * Flow:
 *   1. Avatar tap → file picker → upload to avatars bucket → preview
 *   2. Display name input (required, blocks submit if empty)
 *   3. Location consent toggle
 *   4. "Let's go" → write profile + gdpr + presence → onComplete()
 */
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { Loader2, MapPin, ToggleLeft, ToggleRight, Camera } from 'lucide-react';
import OnboardingBackButton from '../OnboardingBackButton';
import { track, trackOnce } from '@/lib/analytics';

const GOLD = '#C8962C';

export default function QuickSetupScreen({ session, onComplete, onBack }) {
  useEffect(() => {
    trackOnce('quick_setup_started_session', 'quick_setup_started', 'onboarding');
  }, []);

  const [displayName, setDisplayName]       = useState('');
  const [avatarUrl, setAvatarUrl]           = useState('');
  const [avatarPreview, setAvatarPreview]   = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const fileInputRef                        = useRef(null);

  const userId    = session?.user?.id;
  const userEmail = session?.user?.email;

  // ── Avatar pick + upload ───────────────────────────────────────────────────
  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setAvatarUploading(true);

    try {
      const ext  = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const url  = await uploadToStorage(file, 'avatars', path);
      setAvatarUrl(url);
    } catch (err) {
      console.error('[QuickSetup] avatar upload failed:', err);
      // Non-fatal — avatar is optional, preview stays for this session
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!userId || loading) return;
    const name = displayName.trim();
    if (!name) { setError('Add a name so people know who you are.'); return; }

    setLoading(true);
    setError('');

    try {
      // GPS consent
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
          // Denied at OS level — continue without; re-grantable later
        }
      }

      // Profile upsert — name + avatar + consents
      await supabase.from('profiles').upsert(
        {
          id:                    userId,
          display_name:          name,
          ...(avatarUrl ? { avatar_url: avatarUrl, has_avatar: true } : {}),
          has_display_name:      true,
          has_consented_gps:     locationEnabled,
          consent_accepted:      true,
          has_agreed_terms:      true,
          onboarding_stage:      'quick_setup',
          community_attested_at: new Date().toISOString(),
          is_online:             true,
          is_visible:            true,
          updated_at:            new Date().toISOString(),
          ...(coords ? { last_loc_ts: new Date().toISOString() } : {}),
        },
        { onConflict: 'id' }
      );

      // GDPR record
      await supabase.from('gdpr_consents').insert({
        user_email:   userEmail,
        consent_type: 'onboarding_v2',
        granted:      true,
        granted_at:   new Date().toISOString(),
      });

      // Presence
      if (coords) {
        await supabase.from('user_presence').upsert(
          {
            user_id:     userId,
            status:      'online',
            last_seen_at: new Date().toISOString(),
            location:    `POINT(${coords.coords.longitude} ${coords.coords.latitude})`,
            expires_at:  new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            metadata:    { source: 'onboarding' },
          },
          { onConflict: 'user_id' }
        );
      }

      try {
        localStorage.setItem('hm_age_gate_passed', 'true');
        localStorage.setItem('hm_community_attested_v1', 'true');
      } catch {}

      track('quick_setup_completed', 'onboarding',
        locationEnabled ? 'with_location' : 'no_location');

      onComplete();
    } catch (err) {
      console.error('[QuickSetup] error:', err);
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = displayName.trim().length > 0 && !loading;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 overflow-y-auto">
      <OnboardingBackButton onBack={onBack} />
      <div className="w-full max-w-xs py-12">

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 transition-colors"
            style={{ borderColor: avatarPreview ? GOLD : 'rgba(255,255,255,0.15)' }}
            aria-label="Add profile photo"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Your photo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center gap-1">
                <Camera className="w-6 h-6 text-white/30" />
                <span className="text-[10px] text-white/30 font-medium">Photo</span>
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarPick}
          />
        </div>

        {/* Name */}
        <div className="mb-8">
          <input
            type="text"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); if (error) setError(''); }}
            placeholder="Your name"
            maxLength={40}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-base font-medium placeholder-white/25 outline-none transition-colors"
            style={{ borderColor: displayName.trim() ? 'rgba(200,150,44,0.5)' : undefined }}
            autoComplete="name"
            autoFocus
          />
          <p className="text-white/25 text-[11px] mt-2 ml-1">
            Optional photo. Name is required — people need to know who Boo'd them.
          </p>
        </div>

        {/* Location toggle */}
        <div className="flex items-center justify-between mb-8 py-4 border-y border-white/10">
          <div className="flex items-center gap-3">
            <MapPin
              className="w-5 h-5 flex-shrink-0"
              style={{ color: locationEnabled ? GOLD : '#555' }}
            />
            <span className="text-white text-sm font-medium leading-tight">
              Show me on Pulse
            </span>
          </div>
          <button
            onClick={() => setLocationEnabled(v => !v)}
            className="flex-shrink-0 ml-3"
            aria-label={locationEnabled ? 'Disable location' : 'Enable location'}
          >
            {locationEnabled
              ? <ToggleRight className="w-9 h-9" style={{ color: GOLD }} />
              : <ToggleLeft className="w-9 h-9 text-white/20" />}
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
          style={{ backgroundColor: GOLD, opacity: canSubmit ? 1 : 0.35 }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Let's go"}
        </button>

        <p className="text-white/20 text-[11px] mt-6 leading-relaxed">
          Tapping Let's go agrees to the Terms and confirms you've read the community charter.
        </p>

        {error && <p className="text-red-400 text-xs mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
}
