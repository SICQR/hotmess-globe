/**
 * /redeem/:code  (and /redeem with paste-in form)
 *
 * Beta access redemption — paste/click a BETA-XXXXX code, get 14 days of
 * premium-equivalent access. Idempotent extension if user already has
 * an active beta window.
 *
 * Phil 2026-05-27 — 250-user 2-week cohort.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
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

export default function RedeemPage() {
  const { code: paramCode } = useParams();
  const navigate = useNavigate();

  const [code, setCode] = useState(paramCode || '');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState(null);
  const [until, setUntil] = useState(null);

  const submit = useCallback(async (theCode) => {
    const c = String(theCode || '').trim();
    if (!c) {
      setStatus('error');
      setError('Enter a code first.');
      return;
    }
    setStatus('submitting');
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Not signed in — store pending code (survives onboarding) + bounce to auth.
        // Auth.jsx supports ?redirect= but onboarding can swallow it, so localStorage
        // is the resilient fallback. After onboarding completes, App.jsx checks for
        // hm_pending_beta_code and redirects to /redeem/CODE to fire the claim.
        try { localStorage.setItem('hm_pending_beta_code', c); } catch { /* ignore */ }
        navigate(`/auth?redirect=${encodeURIComponent(`/redeem/${encodeURIComponent(c)}`)}`);
        return;
      }
      const res = await fetch('/api/beta/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
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
        trackEvent('beta_redeem_failed', { category: 'beta', code: c, reason: json.error });
        return;
      }
      try { localStorage.removeItem('hm_pending_beta_code'); } catch { /* ignore */ }
      setUntil(json.beta_access_until);
      setStatus('success');
      trackEvent('beta_redeem_success', { category: 'beta', code: c });
    } catch (e) {
      setError(e?.message || 'Network error.');
      setStatus('error');
    }
  }, [navigate]);

  // Auto-submit if a code was provided via URL
  useEffect(() => {
    if (paramCode) submit(paramCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramCode]);

  return (
    <div style={{ minHeight: '100dvh', background: BG, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-1 flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ background: CARD, borderRadius: 24, padding: 24, width: '100%', maxWidth: 380, border: `1px solid ${GOLD}33` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} style={{ color: GOLD }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
              Beta Access
            </span>
          </div>

          {status !== 'success' && (
            <>
              <h1 className="text-2xl font-black uppercase leading-tight">
                Two weeks of HOTMESS, on us.
              </h1>
              <p className="text-white/50 text-sm mt-2 leading-relaxed">
                Enter your invite code to unlock everything for 14 days. No card, no auto-bill.
              </p>

              <div className="mt-6">
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="BETA-XXXXX"
                  value={code}
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

              <button
                onClick={() => submit(code)}
                disabled={status === 'submitting' || !code.trim()}
                className="mt-4 w-full h-12 rounded-xl text-black font-black text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
                style={{ background: GOLD }}
              >
                {status === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Redeem code <ArrowRight size={16} /></>}
              </button>

              <p className="text-white/30 text-[10px] mt-4 text-center leading-relaxed">
                No code? <Link to="/membership/upgrade" className="text-white/60 underline">Become a member</Link> for full access.
              </p>
            </>
          )}

          {status === 'success' && (
            <div className="text-center py-2">
              <div
                className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: `${GREEN}22`, border: `1px solid ${GREEN}55` }}
              >
                <Check size={28} style={{ color: GREEN }} />
              </div>
              <h2 className="text-xl font-black uppercase">You’re in.</h2>
              <p className="text-white/60 text-sm mt-2">
                Beta access active for <span style={{ color: GOLD, fontWeight: 800 }}>{fmt14Days(until)}</span>.
              </p>
              <button
                onClick={() => navigate('/pulse')}
                className="mt-6 w-full h-12 rounded-xl text-black font-black text-sm uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{ background: GOLD }}
              >
                Enter HOTMESS <ArrowRight size={16} />
              </button>
              <p className="text-white/30 text-[10px] mt-4 leading-relaxed">
                Spot a bug or have an idea? Tap the floating <strong className="text-white/50">Beta Feedback</strong> button anywhere in the app.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
