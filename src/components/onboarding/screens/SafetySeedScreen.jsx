/**
 * SafetySeedScreen — Active Network Enrollment (#661-B + #661-C).
 *
 * Phil-locked 2026-06-05 (D59_661_LOCKED_SCOPE.md). Four phases:
 *
 *   1. nudge   — "Build Your Safety Network / Who would want to know..."
 *                One question. Two buttons. No fear language. No wizard.
 *   2. form    — contact name + phone (minimum viable; email/telegram opt).
 *   3. review  — "What Paul will receive" — relationship screen, not
 *                confirmation screen. Renders the exact invitation +
 *                three-option sovereignty footer (Accept / Decline /
 *                Ask not to be contacted again. Never auto-added).
 *   4. sent    — "We'll let Paul know" success state.
 *
 * On Send Invitation → POST /api/safety/dispatch-invitation (live since
 * 2026-06-05 PR #917). Writes trusted_contacts row, fires email/SMS/Telegram
 * invitation. Recipient lands on /contact/accept/:id (D59 S2 acceptance
 * page, live since PR #915).
 *
 * Amendment A (Phil-locked): this screen NEVER says "SOS unavailable" or
 * "Live SOS won't work". The SOS surface stays available in every network
 * state; dispatcher gates fan-out server-side. No network ≠ no help.
 *
 * Props:
 *   session      — Supabase session (onboarding path passes this in)
 *   onComplete   — called when done in onboarding flow
 *   onBack       — called to go back in onboarding flow
 *   standalone   — true when mounted at /safety/setup (post-activation).
 *                  Standalone: own session, back nav, /safety on done.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { Loader2, Shield, ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';
import OnboardingBackButton from '../OnboardingBackButton';
import { track, trackOnce } from '@/lib/analytics';

const GOLD = '#C8962C';

export default function SafetySeedScreen({ session: sessionProp, onComplete, onBack, standalone = false }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(sessionProp || null);
  const [nominatorName, setNominatorName] = useState('there');

  // Four-phase state machine — Phil-locked #661 scope.
  const [phase, setPhase] = useState('nudge'); // 'nudge' | 'form' | 'review' | 'sent'

  // Contact form fields.
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Submit + dispatcher state.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Standalone mode fetches its own session.
  useEffect(() => {
    if (standalone && !sessionProp) {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s) setSession(s);
      });
    }
  }, [standalone, sessionProp]);

  // Resolve nominator display name for the Review preview.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const first = (data?.display_name || '').trim().split(/\s+/)[0];
        if (first) setNominatorName(first);
      });
  }, [session?.user?.id]);

  useEffect(() => {
    if (!standalone) {
      trackOnce('safety_seed_started_session', 'safety_seed_started', 'onboarding');
    }
  }, [standalone]);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  // ── Skip path (from nudge phase). Honest: marks intent, no fear language.
  const handleSkip = async () => {
    setLoading(true);
    try {
      // Record honest skip — gives morning digest the signal that the nudge
      // was shown and declined, vs never shown.
      track('safety_seed_skipped', 'onboarding');

      if (standalone) {
        // From Home card: bounce back to Home / Safety landing without lecture.
        navigate('/');
      } else {
        // In onboarding flow: advance without setting opt-in.
        await supabase
          .from('profiles')
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        onComplete();
      }
    } catch (err) {
      console.error('[SafetySeed] skip error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Send Invitation path (from review phase). Writes the row, fires
  // dispatcher, advances to sent phase.
  const handleSend = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!userEmail || !userId) {
        throw new Error('Session missing. Sign in again.');
      }

      // Step 1: write the trusted_contacts row. user_id is canonical
      // (D59 S0); user_email kept for legacy RLS overlap.
      const { data: tcRow, error: insertErr } = await supabase
        .from('trusted_contacts')
        .insert({
          user_id: userId,
          user_email: userEmail,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: null,
          notify_on_sos: true,
          notify_on_checkout: true,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      if (!tcRow?.id) throw new Error('Failed to record contact.');

      track('safety_seed_contact_added', 'onboarding', { channel: 'phone' });

      // Step 2: fire D59 S1 dispatcher (live on prod since PR #917).
      // Authorization: caller's JWT.
      const accessToken = session?.access_token;
      if (accessToken) {
        try {
          const dispatchRes = await fetch('/api/safety/dispatch-invitation', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ trusted_contact_id: tcRow.id }),
          });
          const dispatchData = await dispatchRes.json().catch(() => ({}));
          if (!dispatchRes.ok) {
            // Don't fail the flow on dispatcher errors — row is written,
            // user can retry from Settings. Telemetry it so we see failures
            // in the morning digest.
            track('safety_seed_dispatch_failed', 'onboarding', {
              status: dispatchRes.status,
              error: dispatchData?.error || 'unknown',
            });
          } else {
            track('safety_seed_dispatch_ok', 'onboarding', {
              any_succeeded: !!dispatchData?.any_succeeded,
            });
          }
        } catch (dErr) {
          track('safety_seed_dispatch_fetch_failed', 'onboarding', {
            error: dErr?.message || 'fetch_failed',
          });
        }
      }

      setPhase('sent');
    } catch (err) {
      console.error('[SafetySeed] send error:', err);
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Continue from sent phase into next step.
  const handleContinueFromSent = async () => {
    setLoading(true);
    try {
      if (standalone) {
        toast.success("We'll let them know.");
        navigate('/');
      } else {
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
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

  const canSubmitForm = contactName.trim().length > 0 && contactPhone.trim().length > 0;
  const firstName = contactName.trim().split(/\s+/)[0] || 'them';

  // ─────────────────────────────────────────────────────────────────
  // PHASE 1 — NUDGE (Phil-locked #661-B)
  // One question. Two buttons. Nothing else.
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'nudge') {
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

          <Shield className="w-8 h-8 mb-6" style={{ color: GOLD }} />

          <h1 className="text-white text-2xl font-bold mb-4 leading-tight">
            Build Your Safety Network
          </h1>

          <p className="text-white/70 text-base leading-relaxed mb-10">
            Who would want to know if something happened to you tonight?
          </p>

          <button
            onClick={() => {
              track('safety_seed_nudge_add_someone', 'onboarding');
              setPhase('form');
            }}
            className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide mb-3"
            style={{ backgroundColor: GOLD }}
          >
            Add Someone
          </button>

          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full py-3 text-sm font-medium"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Skip For Now'}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 2 — FORM
  // Minimal contact capture. Name + phone. No more.
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'form') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
        <button
          onClick={() => setPhase('nudge')}
          className="absolute top-14 left-5 flex items-center gap-1 text-white/40 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-full max-w-xs">
          {!standalone && <ProgressDots current={5} total={5} />}

          <h2 className="text-white text-xl font-bold mb-2">Who are you adding?</h2>
          <p className="text-white/50 text-sm mb-8">
            They'll be asked if they want to join your safety network. Nothing
            happens automatically.
          </p>

          <div className="mb-4">
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Their name"
              className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
              style={{ borderBottomColor: contactName ? GOLD : '#333' }}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="mb-10">
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Their phone"
              className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
              style={{ borderBottomColor: contactPhone ? GOLD : '#333' }}
              autoComplete="tel"
            />
          </div>

          <button
            onClick={() => {
              track('safety_seed_form_review', 'onboarding');
              setPhase('review');
            }}
            disabled={!canSubmitForm}
            className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
            style={{
              backgroundColor: GOLD,
              opacity: canSubmitForm ? 1 : 0.3,
            }}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 3 — REVIEW (Phil-locked Amendment B / #661-C)
  // Relationship screen, not confirmation screen.
  // Title: "What {firstName} will receive"
  // Body: exact rendered invitation preview
  // Footer: sovereignty disclosure (Accept / Decline / Ask not to be contacted)
  // CTA: Send Invitation
  // ─────────────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center px-6 py-14 overflow-y-auto">
        <button
          onClick={() => setPhase('form')}
          className="absolute top-14 left-5 flex items-center gap-1 text-white/40 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-full max-w-xs">
          <h2 className="text-white text-xl font-bold mb-6 mt-8">
            What {firstName} will receive
          </h2>

          {/* Rendered invitation preview — the load-bearing element. */}
          <div
            className="rounded-xl p-5 mb-6 border"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.3em] mb-3"
              style={{ color: GOLD }}
            >
              HOTMESS · Safety invitation
            </p>
            <p className="text-white text-base font-semibold mb-3 leading-snug">
              {nominatorName} has added you to their safety network on HOTMESS.
            </p>
            <p className="text-white/60 text-sm leading-relaxed mb-3">
              If they ever send an SOS, you'd be one of the people HOTMESS notifies.
            </p>
            <p
              className="text-xs px-3 py-2 rounded inline-block"
              style={{
                background: 'rgba(200,150,44,0.08)',
                color: GOLD,
              }}
            >
              Tap to accept or decline →
            </p>
          </div>

          {/* Sovereignty footer — non-negotiable. */}
          <div className="mb-8 px-1">
            <p className="text-white/60 text-sm leading-relaxed mb-2">
              They can:
            </p>
            <ul className="text-white/70 text-sm leading-relaxed mb-3 space-y-1">
              <li>• Accept</li>
              <li>• Decline</li>
              <li>• Ask not to be contacted again</li>
            </ul>
            <p className="text-white/50 text-xs leading-relaxed">
              They are never added automatically.
            </p>
          </div>

          {error && (
            <div
              className="mb-4 p-3 rounded text-sm"
              style={{ background: 'rgba(255,80,80,0.1)', color: '#FF9999' }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
            style={{
              backgroundColor: GOLD,
              opacity: loading ? 0.4 : 1,
            }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invitation'}
          </button>

          <button
            onClick={() => setPhase('form')}
            disabled={loading}
            className="w-full py-3 mt-2 text-sm font-medium"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 4 — SENT
  // "We'll let Paul know" success state.
  // No fear language. No "Live SOS waits" lie.
  // ─────────────────────────────────────────────────────────────────
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
            HOTMESS just sent {firstName} a short message asking if they want
            to join your safety network. They confirm in their own time.
          </p>
          <p className="text-white/40 text-xs leading-relaxed">
            You'll see when {firstName} accepts. Until then, your network shows
            as Pending on Home.
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
