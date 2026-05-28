/**
 * QuickSetupScreen — Location consent + GDPR + terms.
 *
 * 2026-05-09: name/photo capture deferred to a post-onboarding banner
 * ("Add a name so people know who Boo'd them"). This screen now only
 * captures the consents we cannot legally defer:
 *   - GPS consent (Pulse cannot render without it)
 *   - Terms / community attestation
 *   - GDPR consent record
 *
 * Passkey prompt is still surfaced after consent — it's free friction-
 * removal for returning users.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Loader2, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import OnboardingBackButton from '../OnboardingBackButton';
import { isWebAuthnSupported, isPasskeyRegistered, registerPasskey } from '@/lib/passkey';
import { track, trackOnce } from '@/lib/analytics';

const GOLD = '#C8962C';

export default function QuickSetupScreen({ session, onComplete, onBack }) {
  useEffect(() => {
    trackOnce('quick_setup_started_session', 'quick_setup_started', 'onboarding');
  }, []);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const handleSubmit = async () => {
    if (!userId || loading) return;
    setLoading(true);
    setError('');

    try {
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
          // Location denied at OS level — continue without it; user can re-grant later
        }
      }

      await supabase.from('profiles').upsert(
        {
          id: userId,
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
        localStorage.setItem('hm_age_gate_passed', 'true');
        localStorage.setItem('hm_community_attested_v1', 'true');
      } catch {}

      track('quick_setup_completed', 'onboarding', locationEnabled ? 'with_location' : 'no_location');

      // M6 (Phil 2026-05-28): Face ID/Passkey prompt stripped. Supabase auth doesn't support
      // factor_type='webauthn' — registerPasskey errored silently and onComplete fired anyway.
      // Sacred Invariant #4 violation (symbolic capability). Restore when Passkey is actually
      // wired through Supabase factor_type='totp' or a real WebAuthn backend.
      onComplete();
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
<OnboardingBackButton onBack={onBack} />
      <div className="w-full max-w-xs py-12">
        <h2 className="text-white text-2xl font-black mb-2 tracking-tight">One last thing.</h2>
        <p className="text-white/40 text-sm mb-10 leading-relaxed">
          Pulse shows who's nearby right now. We need your location to put
          you on the map. Your exact spot is never shown — only your area.
        </p>

        <div className="flex items-center justify-between mb-10 py-4 border-y border-white/10">
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
            onClick={() => setLocationEnabled((v) => !v)}
            className="flex-shrink-0 ml-3"
            aria-label={locationEnabled ? 'Disable location sharing' : 'Enable location sharing'}
          >
            {locationEnabled ? (
              <ToggleRight className="w-9 h-9" style={{ color: GOLD }} />
            ) : (
              <ToggleLeft className="w-9 h-9 text-white/20" />
            )}
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
          style={{
            backgroundColor: GOLD,
            opacity: loading ? 0.4 : 1,
          }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Let's go"}
        </button>

        <p className="text-white/20 text-[11px] mt-6 leading-relaxed">
          Tapping Let's go agrees to the Terms and confirms you've read the
          community charter. You can add a name and photo later from your profile.
        </p>

        {error && (
          <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
