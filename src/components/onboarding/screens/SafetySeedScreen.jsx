/**
 * SafetySeedScreen — "Who's got your back?" onboarding.
 *
 * D59 onboarding intervention (Phil 2026-06-04 reframe):
 * Field data 2026-06-04 showed 249/254 users skipping this screen because
 * the copy framed it as a safety feature ("Hotmess has your back") rather
 * than a relationship question. Users don't wake up wanting a safety
 * network; they wake up wanting friends, dates, community, someone who
 * knows where they are. Safety is a by-product.
 *
 * Reframe: ask the emotionally true question. Make skip honest — disclose
 * that Live SOS will be unavailable. Tell the user what happens next
 * (we'll invite them; they'll need to accept).
 *
 * Uses user_email for RLS on trusted_contacts.
 * Uses user_id for fake_call_callers.
 *
 * Props:
 *   session      — Supabase session (onboarding path passes this in)
 *   onComplete   — called when done in onboarding flow
 *   onBack       — called to go back in onboarding flow
 *   standalone   — true when mounted at /safety/setup (post-activation)
 *                  In standalone mode: fetches its own session, shows a back
 *                  button, navigates to /safety on completion, shows a toast,
 *                  and does NOT write onboarding_stage.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { Loader2, Shield, ArrowLeft, Check } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';
import OnboardingBackButton from '../OnboardingBackButton';
import { track, trackOnce } from '@/lib/analytics';

const GOLD = '#C8962C';

export default function SafetySeedScreen({ session: sessionProp, onComplete, onBack, standalone = false }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(sessionProp || null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  // D59 onboarding intervention — show post-submit success state with
  // "we'll invite them" disclosure so user understands acceptance is required.
  const [showSentState, setShowSentState] = useState(false);
  // Skip-confirmation state — first tap shows honest disclosure, second tap confirms.
  const [confirmingSkip, setConfirmingSkip] = useState(false);

  // In standalone mode we fetch our own session since no parent passes one in
  useEffect(() => {
    if (standalone && !sessionProp) {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s) setSession(s);
      });
    }
  }, [standalone, sessionProp]);

  useEffect(() => {
    if (!standalone) {
      trackOnce('safety_seed_started_session', 'safety_seed_started', 'onboarding');
    }
  }, [standalone]);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  // D59 onboarding intervention — when a contact is added, show the "we'll
  // invite them" success state in-flow so the user understands what happens
  // next. Continue is one tap from there. The invitation itself fires from
  // the D59 S1 dispatcher (task #653) — until that ships, the trusted_contacts
  // row sits ready for the cron to pick up.
  const handleSubmit = async (skip = false) => {
    // Skip path with confirmation gate
    if (skip && !confirmingSkip) {
      setConfirmingSkip(true);
      track('safety_seed_skip_confirm_shown', 'onboarding');
      return;
    }

    setLoading(true);
    try {
      if (!skip && contactName.trim() && contactPhone.trim() && userEmail) {
        // Write trusted contact
        await supabase.from('trusted_contacts').insert({
          user_email: userEmail,
          contact_name: contactName.trim(),
          contact_email: null,
          contact_phone: contactPhone.trim(),
          notify_on_sos: true,
          notify_on_checkout: true,
        });

        // Seed default fake call caller
        await supabase.from('fake_call_callers').insert({
          user_id: userId,
          name: 'Hotmess',
          relationship: 'app',
          is_preset: true,
          personality: 'concerned_friend',
          scripts: {
            opening: "Hey, you ok? I've been trying to reach you.",
            followup: "I'm outside, come out when you can.",
          },
        });

        // Mark profile safety_opt_in immediately so SOS surfaces know a
        // nomination exists (status will land via D59 S0 schema work).
        await supabase
          .from('profiles')
          .update({ safety_opt_in: true, updated_at: new Date().toISOString() })
          .eq('id', userId);

        track('safety_seed_contact_added', 'onboarding', {
          channel: 'phone',
        });

        // Show "we'll invite them" success state — keeps user informed
        // about acceptance before they move on.
        setShowSentState(true);
        setLoading(false);
        return;
      }

      // Skip path or no-contact paths fall through here.
      if (standalone) {
        navigate('/safety');
      } else {
        await supabase
          .from('profiles')
          .update({
            safety_opt_in: false,
            onboarding_stage: 'location',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        track('safety_seed_skipped', 'onboarding');
        onComplete();
      }
    } catch (err) {
      console.error('[SafetySeed] error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Continue from the "we've nominated them" success state into the next
  // onboarding step. Separate from handleSubmit so the success view is its
  // own moment, not a transient toast.
  const handleContinueFromSent = async () => {
    setLoading(true);
    try {
      if (standalone) {
        toast.success('Safety profile updated');
        navigate('/safety');
      } else {
        await supabase
          .from('profiles')
          .update({ onboarding_stage: 'location', updated_at: new Date().toISOString() })
          .eq('id', userId);
        track('safety_seed_completed', 'onboarding');
        onComplete();
      }
    } catch (err) {
      console.error('[SafetySeed] continue error:', err);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = contactName.trim().length > 0 && contactPhone.trim().length > 0;

  // ── Post-submit success view: "we'll invite them"
  if (showSentState) {
    const firstName = contactName.trim().split(/\s+/)[0] || 'them';
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs">
          {!standalone && <ProgressDots current={5} total={5} />}

          <div
            className="rounded-xl p-6 mb-8"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(200,150,44,0.15)' }}
            >
              <Check className="w-6 h-6" style={{ color: GOLD }} />
            </div>
            <h2 className="text-white text-lg font-bold mb-3">
              We'll let {firstName} know.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-3">
              HOTMESS will send {firstName} a short message explaining what you've
              chosen them for. Nothing happens automatically — they confirm in
              their own time.
            </p>
            <p className="text-white/40 text-xs leading-relaxed">
              You'll see when {firstName} accepts. Until then, Live SOS waits.
            </p>
          </div>

          <button
            onClick={handleContinueFromSent}
            disabled={loading}
            className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
            style={{
              backgroundColor: GOLD,
              opacity: loading ? 0.3 : 1,
            }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      {standalone ? (
        <button
          onClick={() => navigate(-1)}
          className="absolute top-14 left-5 flex items-center gap-1 text-white/40 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      ) : (
        <OnboardingBackButton onBack={onBack} />
      )}
      <div className="w-full max-w-xs">
        {!standalone && <ProgressDots current={5} total={5} />}

        {/* Who's got your back? — D59 onboarding intervention */}
        <div
          className="rounded-xl p-6 mb-8"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <Shield className="w-8 h-8 mb-4" style={{ color: GOLD }} />
          <h2 className="text-white text-lg font-bold mb-2">
            Who's got your back?
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            If your phone died at 4am, who would you want HOTMESS to help you reach?
          </p>
          <p className="text-white/40 text-xs leading-relaxed">
            Add one person. You can always add more later.
          </p>
        </div>

        {/* Contact fields */}
        <div className="mb-4">
          <input
            type="text"
            value={contactName}
            onChange={(e) => { setContactName(e.target.value); setConfirmingSkip(false); }}
            placeholder="Their name"
            className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
            style={{ borderBottomColor: contactName ? GOLD : '#333' }}
            autoComplete="off"
          />
        </div>

        <div className="mb-10">
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => { setContactPhone(e.target.value); setConfirmingSkip(false); }}
            placeholder="Their phone"
            className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
            style={{ borderBottomColor: contactPhone ? GOLD : '#333' }}
            autoComplete="tel"
          />
        </div>

        {/* CTAs */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={!canSubmit || loading}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity mb-3"
          style={{
            backgroundColor: GOLD,
            opacity: canSubmit && !loading ? 1 : 0.3,
          }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add this person'}
        </button>

        {/* Honest skip — first tap shows disclosure, second tap confirms. */}
        {confirmingSkip ? (
          <div className="px-1">
            <p
              className="text-xs leading-relaxed mb-3 px-2"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Live SOS will not work until you set this up. You can add someone
              anytime in Settings. In an emergency: call 999.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingSkip(false)}
                className="flex-1 py-3 text-sm font-medium rounded-lg"
                style={{
                  color: GOLD,
                  background: 'rgba(200,150,44,0.08)',
                }}
              >
                Go back
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="flex-1 py-3 text-sm font-medium rounded-lg"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Skip anyway
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => standalone ? navigate('/safety') : handleSubmit(true)}
            disabled={loading}
            className="w-full py-3 text-sm font-medium"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {standalone ? 'Not now' : 'Skip for now'}
          </button>
        )}
      </div>
    </div>
  );
}
