/**
 * /redeem  (and /redeem/:code with the code pre-filled)
 *
 * Beta access redemption. UX rewritten 2026-05-27 (Phil) to show a clear
 * "You've been invited" landing FIRST when the user isn't signed in,
 * rather than dumping them on /auth with no context.
 *
 * Flow:
 *  - paramCode + signed in  → auto-claim, success state
 *  - paramCode + signed out → show invite hero with code + "Sign in to claim"
 *  - no paramCode           → manual paste form
 *
 * Aligned with existing ?ref= sessionStorage convention used by SignUpScreen
 * (line 57): we also write hm_referral_code so the post-onboarding pickup
 * can converge on a single claim path later.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertTriangle, Sparkles, ArrowRight, Gift, LogIn } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { trackEvent } from '@/components/utils/analytics';

const BG = '#050507';
const CARD = '#0D0D0F';
const GOLD = '#C8962C';
const RED = '#FF3D2E';
const GREEN = '#39FF14';

function fmt14Days(iso) {
  if (!iso) return '14 days';
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  return `${days} day${days === 1 ? '' : 's'}`;
}

function persistCodeForPostAuthClaim(code) {
  try { sessionStorage.setItem('hm_referral_code', code); } catch { /* ignore */ }
  try { sessionStorage.setItem('hm_pending_beta_code', code); } catch { /* ignore */ }
}

export default function RedeemPage() {
  const { code: paramCode } = useParams();
  const navigate = useNavigate();

  const [code, setCode] = useState(paramCode || '');
  const [status, setStatus] = useState('checking_session');
  const [error, setError] = useState(null);
  const [until, setUntil] = useState(null);

  const submit = useCallback(async (theCode) => {
    const c = String(theCode || '').trim();
    if (!c) {
      setStatus('error'); setError('Enter a code first.'); return;
    }
    setStatus('submitting'); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        persistCodeForPostAuthClaim(c);
        setStatus('needs_auth');
        return;
      }
      const res = await fetch('/api/beta/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code: c }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map = {
          invalid_code: 'That code isn’t valid.',
          code_exhausted: 'That code has already been used.',
          code_expired: 'That code has expired.',
          code_required: 'Enter a code first.',
          unauthenticated: 'Please sign in to redeem.',
        };
        setError(map[json.error] || 'Could not redeem. Try again.');
        setStatus('error');
        try { trackEvent('beta_redeem_failed', { category: 'beta', code: c, reason: json.error }); } catch { /* ignore */ }
        return;
      }
      try { sessionStorage.removeItem('hm_referral_code'); sessionStorage.removeItem('hm_pending_beta_code'); } catch { /* ignore */ }
      setUntil(json.beta_access_until);
      setStatus('success');
      try { trackEvent('beta_redeem_success', { category: 'beta', code: c }); } catch { /* ignore */ }
    } catch (e) {
      setError(e?.message || 'Network error.');
      setStatus('error');
    }
  }, []);

  // On mount: session check. Auto-claim if signed in + param code; else invite hero.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (paramCode && session?.access_token) {
        submit(paramCode);
      } else if (paramCode) {
        persistCodeForPostAuthClaim(paramCode);
        try { trackEvent('beta_invite_landing_viewed', { category: 'beta', code: paramCode }); } catch { /* ignore */ }
        setStatus('needs_auth');
      } else {
        setStatus('idle');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramCode]);

  const goSignIn = () => {
    const c = code || paramCode || '';
    if (c) persistCodeForPostAuthClaim(c);
    try { trackEvent('beta_invite_signin_tapped', { category: 'beta', code: c }); } catch { /* ignore */ }
    // Doctrine 11: Single Auth Authority. Invitees go through the canonical
    // gate chain (Splash → AgeGate → Bridge → SignUpScreen) at '/'.
    // /auth is the legacy parallel auth surface that bypasses splash/age/consent
    // — compliance audit 2026-05-29 (Phil locked). Beta code persists in
    // sessionStorage and PR 4 (/auth/callback claim sweep) resolves it post-auth.
    navigate('/');
  };

  if (status === 'checking_session') {
    return (
      <div style={{ minHeight: '100dvh', background: BG }} className="flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: '#fff' }} className="flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ background: CARD, borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, border: `1px solid ${GOLD}33` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} style={{ color: GOLD }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: GOLD }}>HOTMESS Beta Access</span>
          </div>

          {status === 'success' && (
            <div className="text-center py-2">
              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: `${GREEN}22`, border: `1px solid ${GREEN}55` }}>
                <Check size={28} style={{ color: GREEN }} />
              </div>
              <h2 className="text-2xl font-black uppercase">You&apos;re in.</h2>
              <p className="text-white/60 text-sm mt-2">Beta access active for <span style={{ color: GOLD, fontWeight: 800 }}>{fmt14Days(until)}</span>.</p>
              <button onClick={() => navigate('/pulse')} className="mt-6 w-full h-12 rounded-xl text-black font-black text-sm uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform" style={{ background: GOLD }}>
                Enter HOTMESS <ArrowRight size={16} />
              </button>
            </div>
          )}

          {status === 'needs_auth' && (
            <>
              <div className="flex items-center gap-3 mb-4 mt-1">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}44` }}>
                  <Gift size={22} style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-wider">You&apos;ve been invited</p>
                  <p className="text-white/40 text-[11px] mt-0.5">14 days. Full access. No card.</p>
                </div>
              </div>
              <h1 className="text-2xl font-black uppercase leading-tight">Welcome to HOTMESS.</h1>
              <p className="text-white/55 text-sm mt-2 leading-relaxed">
                You&apos;re holding an invite to the early beta — the global pulse, the safety stack, the music, the people. Two weeks on us, then keep going if it feels right.
              </p>
              <div className="mt-5 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/30 text-[9px] uppercase tracking-widest font-bold">Your code</p>
                <p className="font-mono text-base tracking-widest mt-1" style={{ color: GOLD }}>{paramCode}</p>
              </div>
              <button onClick={goSignIn} className="mt-5 w-full h-12 rounded-xl text-black font-black text-sm uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform" style={{ background: GOLD }}>
                <LogIn size={16} /> Sign in to claim
              </button>
              <p className="text-white/30 text-[10px] mt-4 text-center leading-relaxed">
                New here? You&apos;ll create your account first (takes ~30 seconds). Your invite will land automatically after.
              </p>
            </>
          )}

          {(status === 'idle' || status === 'error') && (
            <>
              <h1 className="text-2xl font-black uppercase leading-tight">Got an invite?</h1>
              <p className="text-white/55 text-sm mt-2 leading-relaxed">Paste your code below to unlock 14 days of full access.</p>
              <div className="mt-5">
                <input
                  type="text" inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false}
                  placeholder="BETA-XXXXX" value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus('idle'); setError(null); }}
                  className="w-full bg-white/5 rounded-xl px-4 py-3.5 text-white text-base font-mono tracking-widest text-center placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/60"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                />
              </div>
              {status === 'error' && error && (
                <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: RED }}>
                  <AlertTriangle size={14} /> <span>{error}</span>
                </div>
              )}
              <button onClick={() => submit(code)} disabled={!code.trim()} className="mt-4 w-full h-12 rounded-xl text-black font-black text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform" style={{ background: GOLD }}>
                Redeem code <ArrowRight size={16} />
              </button>
              <p className="text-white/30 text-[10px] mt-4 text-center leading-relaxed">
                No code? <Link to="/membership/upgrade" className="text-white/60 underline">Become a member</Link> for full access.
              </p>
            </>
          )}

          {status === 'submitting' && (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
