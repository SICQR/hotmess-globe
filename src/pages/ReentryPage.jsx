/**
 * /reentry?token=...
 *
 * Brief 02 closeout. Apology + AgeGate + lock-username + RPC slot assignment.
 *   1. On mount: POST /api/auth/reentry-verify with token → loads profile.
 *   2. If valid: render existing <AgeGateScreen/> → on pass, prefill
 *      username from display_name, allow edit, on confirm POST
 *      /api/auth/reentry-complete.
 *   3. On success: redirect to /?welcome=founding so the home page can show
 *      the one-time "You're in. Original 50 spot {N}." toast.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AgeGateScreen from '@/components/onboarding/screens/AgeGateScreen';

function slugUsername(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'mate';
}

export default function ReentryPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [phase, setPhase] = useState('verifying');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [nextSlot, setNextSlot] = useState(null);
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignedStatus, setAssignedStatus] = useState(null);
  const [spotNumber, setSpotNumber] = useState(null);

  useEffect(() => {
    if (!token) { setError('No reentry token in URL.'); setPhase('error'); return; }
    fetch('/api/auth/reentry-verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(r => r.json()).then(d => {
      if (!d.ok) {
        const map = {
          invalid_token: "This link doesn't look right.",
          expired: 'This link has expired.',
          consumed: "You've already claimed your spot. Welcome back.",
          profile_not_found: "We can't find your profile — reply to phil@hotmessldn.com.",
        };
        setError(map[d.error] || d.error || 'Unknown error');
        setPhase(d.error === 'consumed' ? 'already_done' : 'error');
        return;
      }
      setProfile(d.profile);
      setNextSlot(d.next_available_slot);
      setUsername(d.profile.username || slugUsername(d.profile.display_name));
      setPhase(d.profile.age_verified ? 'lock_username' : 'age_gate');
    }).catch(err => { setError(err.message || 'Network error'); setPhase('error'); });
  }, [token]);

  const onComplete = async () => {
    setSubmitting(true); setError('');
    try {
      const r = await fetch('/api/auth/reentry-complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, locked_username: username }),
      });
      const d = await r.json();
      if (!d.ok) {
        const map = {
          username_taken: 'That username is already taken — pick another.',
          username_invalid: 'Usernames are 3–30 chars: a-z, 0-9, underscore.',
          consumed: "You've already claimed.",
          expired: 'This link has expired.',
        };
        setError(map[d.error] || d.error || 'Unknown error');
        setSubmitting(false);
        return;
      }
      // v2 corrective: stay on /reentry and show the community-register
      // welcome message in-page rather than navigating to home with query
      // params. Keeps copy under our control and matches the brief's table.
      setAssignedStatus(d.founding_status);
      setSpotNumber(d.spot_number ?? null);
      setPhase('done');
      setSubmitting(false);
    } catch (e) {
      setError(e.message || 'Network error');
      setSubmitting(false);
    }
  };

  if (phase === 'verifying') {
    return <div className="min-h-screen bg-[#050507] text-white grid place-items-center"><p className="opacity-60">Loading…</p></div>;
  }
  if (phase === 'error' || phase === 'already_done') {
    return (
      <div className="min-h-screen bg-[#050507] text-white grid place-items-center p-6">
        <div className="max-w-md text-center">
          <p className="text-lg mb-4">{error}</p>
          <a href="mailto:phil@hotmessldn.com" className="text-[#C8962C] underline">phil@hotmessldn.com</a>
        </div>
      </div>
    );
  }
  if (phase === 'age_gate') {
    // After AgeGate passes locally it'll update sessionStorage; we then move on.
    return (
      <div className="min-h-screen bg-[#050507] text-white">
        <AgeGateScreen onPass={() => setPhase('lock_username')} />
      </div>
    );
  }
  if (phase === 'done') {
    // v3 corrective: full welcome SCREEN (not toast) with 3 CTAs per status.
    // Headline + body per brief table; CTAs: primary "Hit the globe", secondary
    // "Upgrade to Hotmess — £7.99/mo" (plain link), tertiary "Or browse the
    // market". /pricing is the existing membership tier surface (wired in
    // src/App.jsx for this campaign). Soft commerce — visible, not pushed.
    let headline, body;
    if (assignedStatus === 'original_50') {
      headline = `You're back. OG 50 spot ${spotNumber ?? ''}.`;
      body = 'Permanent badge on your profile. The receipt for showing up first.';
    } else if (assignedStatus === 'founding') {
      headline = `You're back. Founding member #${spotNumber ?? ''}.`;
      body = 'Welcome home.';
    } else {
      headline = `You're back.`;
      body = 'Welcome home.';
    }
    return (
      <div className="min-h-screen bg-[#050507] text-white grid place-items-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-xs uppercase tracking-[0.12em] text-[#C8962C] mb-3">HOTMESS</div>
          <h1 className="text-2xl leading-snug mb-3 font-medium">{headline.trim()}</h1>
          <p className="text-base opacity-80 mb-8">{body}</p>

          {/* Primary CTA — dominant */}
          <button
            onClick={() => navigate('/pulse', { replace: true })}
            className="w-full py-3 rounded-xl bg-[#C8962C] text-black font-medium"
          >
            Hit the globe &rarr;
          </button>

          {/* Secondary CTA — soft, plain link */}
          <div className="mt-5">
            <a
              href="/pricing?tier=hotmess"
              className="text-sm text-[#C8962C] underline underline-offset-4 hover:opacity-80"
            >
              Upgrade to Hotmess &mdash; &pound;7.99/mo
            </a>
          </div>

          {/* Tertiary CTA — softest */}
          <div className="mt-3">
            <a
              href="/market"
              className="text-sm text-white/60 underline underline-offset-4 hover:opacity-80"
            >
              Or browse the market
            </a>
          </div>
        </div>
      </div>
    );
  }
  // lock_username
  return (
    <div className="min-h-screen bg-[#050507] text-white grid place-items-center p-6">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-medium mb-2">Lock your username</h1>
        <p className="opacity-70 mb-6 text-sm">
          Pick the username you want before someone else takes it.
        </p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          maxLength={30}
          className="w-full px-3 py-3 rounded-xl bg-[#1C1C1E] text-white border border-white/10 focus:border-[#C8962C] focus:outline-none"
          aria-label="username"
        />
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        <button
          onClick={onComplete}
          disabled={submitting || !/^[a-z0-9_]{3,30}$/.test(username)}
          className="mt-4 w-full py-3 rounded-xl bg-[#C8962C] text-black font-medium disabled:opacity-40"
        >
          {submitting ? 'Claiming…' : 'Claim my spot'}
        </button>
      </div>
    </div>
  );
}
