/**
 * PhoneOtpButton — drop-in "Continue with phone" button for SignUpScreen.
 *
 * Flow:
 *   1. Tap button → inline overlay with E.164 phone input
 *   2. Submit → POST /api/auth/phone-otp-send (Twilio Verify)
 *   3. Show 6-digit code input
 *   4. Submit code → POST /api/auth/phone-otp-verify
 *   5. On success: assign window.location to the returned action_link
 *      (Supabase magiclink that lands on /auth/callback with a session)
 *
 * Inline E.164 input (no react-phone-number-input dep yet — follow-up PR
 * can swap in proper country-aware formatting). Validates with regex.
 *
 * Errors surfaced cleanly:
 *   - MISSING_TWILIO_VERIFY_SID → "Phone sign-in isn't set up yet"
 *   - invalid_code → "That code didn't match"
 *   - twilio_unreachable → "Couldn't reach SMS provider"
 */
import React, { useState } from 'react';
import { Loader2, Phone, X } from 'lucide-react';
import { track } from '@/lib/analytics';

const GOLD = '#C8962C';
const E164_RE = /^\+[1-9]\d{6,14}$/;

export default function PhoneOtpButton({ disabled }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phone, setPhone] = useState('+44');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setOpen(false);
    setStep('phone');
    setPhone('+44');
    setCode('');
    setError('');
    setLoading(false);
  };

  const sendCode = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!E164_RE.test(phone)) {
      setError('Use international format, e.g. +447700900123');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/phone-otp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (data?.error === 'TWILIO_VERIFY_SERVICE_SID not configured' ||
            data?.error === 'MISSING_TWILIO_VERIFY_SID') {
          setError("Phone sign-in isn't set up yet. Try Apple, Google, or email.");
        } else {
          setError(data?.error || 'Could not send code. Try again.');
        }
        return;
      }
      track('signup', 'onboarding', 'phone_otp_sent');
      setStep('code');
    } catch (err) {
      setError(err?.message || 'Network error. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!/^\d{4,8}$/.test(code)) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/phone-otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (data?.error === 'invalid_code') {
          setError("That code didn't match. Try again.");
        } else if (data?.error === 'TWILIO_VERIFY_SERVICE_SID not configured' ||
                   data?.error === 'MISSING_TWILIO_VERIFY_SID') {
          setError("Phone sign-in isn't set up yet.");
        } else if (data?.error === 'SUPABASE_ADMIN_NOT_CONFIGURED') {
          setError("Server isn't configured to sign you in by phone yet.");
        } else if (data?.error === 'twilio_unreachable') {
          setError("Couldn't reach SMS provider. Try again.");
        } else {
          setError(data?.error || 'Verification failed. Try again.');
        }
        return;
      }
      track('signup', 'onboarding', 'phone_otp_verified');
      // The action_link is a Supabase magiclink that lands on /auth/callback
      // with a fresh session. Hard-navigate so Supabase processes the hash.
      if (data?.action_link) {
        window.location.assign(data.action_link);
      } else {
        setError('Sign-in succeeded but no session link. Reload the page.');
      }
    } catch (err) {
      setError(err?.message || 'Network error. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-80 disabled:opacity-30"
      >
        <Phone className="w-5 h-5" style={{ color: GOLD }} />
        Continue with phone
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.92)' }}
        >
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-black uppercase tracking-tight">
                {step === 'phone' ? 'Your phone' : 'Enter the code'}
              </h3>
              <button
                onClick={reset}
                className="p-2 bg-white/5 rounded-full text-white/40"
                aria-label="Close phone sign-in"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {step === 'phone' && (
              <form onSubmit={sendCode} className="flex flex-col gap-4">
                <p className="text-white/40 text-xs leading-relaxed">
                  We'll text you a 6-digit code. Standard SMS rates apply.
                </p>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^+\d]/g, ''))}
                  placeholder="+447700900123"
                  className="w-full bg-transparent text-white py-3 border-b focus:outline-none text-lg font-mono placeholder:text-white/25"
                  style={{ borderBottomColor: phone ? GOLD : '#333' }}
                  autoFocus
                  inputMode="tel"
                  autoComplete="tel"
                />
                <button
                  type="submit"
                  disabled={loading || !E164_RE.test(phone)}
                  className="w-full py-4 rounded-xl text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    backgroundColor: GOLD,
                    opacity: loading || !E164_RE.test(phone) ? 0.3 : 1,
                  }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send code'}
                </button>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={verifyCode} className="flex flex-col gap-4">
                <p className="text-white/40 text-xs leading-relaxed">
                  Code sent to <span className="text-white/80 font-semibold">{phone}</span>
                </p>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="123456"
                  className="w-full bg-transparent text-white py-3 border-b focus:outline-none text-2xl font-mono tracking-[0.4em] text-center placeholder:text-white/15"
                  style={{ borderBottomColor: code ? GOLD : '#333' }}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                />
                <button
                  type="submit"
                  disabled={loading || code.length < 4}
                  className="w-full py-4 rounded-xl text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    backgroundColor: GOLD,
                    opacity: loading || code.length < 4 ? 0.3 : 1,
                  }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                  className="text-white/40 text-xs"
                >
                  Wrong number? Start over
                </button>
              </form>
            )}

            {error && (
              <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
