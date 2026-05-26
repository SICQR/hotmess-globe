/**
 * NotificationsScreen — onboarding step that captures the user's preferred
 * external notification channel.
 *
 * Three single-select options, NO pre-selection:
 *   - in-app only   → notification_channel = 'none'
 *   - whatsapp      → notification_channel = 'whatsapp', writes profiles.phone
 *   - telegram      → notification_channel = 'telegram', writes
 *                     telegram_link_token + opens https://t.me/HOTMESSBot
 *
 * Writes are committed only on CONTINUE. SKIP sets channel='none' and
 * advances unconditionally — there is no validation gate.
 *
 * Lives between QuickSetup (location/GPS consent) and finishOnboarding in
 * OnboardingRouter.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { track } from '@/lib/analytics';
import OnboardingBackButton from '../OnboardingBackButton';
import { Loader2 } from 'lucide-react';

const GOLD = '#C8962C';
const BG   = '#050507';

// Permissive E.164 — `+` followed by 8–15 digits, allowing single spaces
// for readability. The DB stores normalised digits.
const E164_RE = /^\+\d{8,15}$/;

function normalisePhone(raw) {
  return raw.replace(/[^\d+]/g, '');
}

export default function NotificationsScreen({ session, onComplete, onBack }) {
  const [choice, setChoice]     = useState(null); // null | 'none' | 'whatsapp' | 'telegram'
  const [phone, setPhone]       = useState('+44');
  const [telegramToken, setTelegramToken] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const userId = session?.user?.id;

  const phoneValid = useMemo(() => {
    if (choice !== 'whatsapp') return true;
    return E164_RE.test(normalisePhone(phone));
  }, [choice, phone]);

  const selectChoice = useCallback(async (next) => {
    setError('');
    setChoice(next);
    track('notifications_channel_selected', 'onboarding', next);

    // Generate Telegram token immediately on select so the deep-link CTA
    // is ready without an extra round-trip.
    if (next === 'telegram' && userId && !telegramToken) {
      const token = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setTelegramToken(token);
      try {
        await supabase
          .from('profiles')
          .update({
            telegram_link_token: token,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch (e) {
        console.warn('[Notifications] telegram token write failed:', e?.message);
      }
    }
  }, [userId, telegramToken]);

  const handleOpenTelegram = useCallback(() => {
    if (!telegramToken) return;
    track('telegram_deep_link_opened', 'onboarding');
    window.open(`https://t.me/HOTMESSBot?start=${telegramToken}`, '_blank', 'noopener,noreferrer');
  }, [telegramToken]);

  const handleContinue = useCallback(async () => {
    if (!userId || saving) return;
    if (!choice) {
      setError('Pick one — or hit skip.');
      return;
    }
    if (choice === 'whatsapp' && !phoneValid) {
      setError('Enter a full number with country code, e.g. +447700900123.');
      return;
    }
    setSaving(true);
    setError('');

    const patch = {
      notification_channel: choice,
      updated_at: new Date().toISOString(),
    };
    if (choice === 'whatsapp') {
      patch.phone = normalisePhone(phone);
    }

    try {
      const { error: upErr } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId);
      if (upErr) throw upErr;
      track('notifications_channel_saved', 'onboarding', choice);
      onComplete?.();
    } catch (e) {
      console.error('[Notifications] save failed:', e);
      setError('Could not save — try again.');
      setSaving(false);
    }
  }, [userId, saving, choice, phone, phoneValid, onComplete]);

  const handleSkip = useCallback(async () => {
    if (!userId || saving) return;
    setSaving(true);
    setError('');
    try {
      await supabase
        .from('profiles')
        .update({
          notification_channel: 'none',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      track('notifications_channel_skipped', 'onboarding');
    } catch (e) {
      console.warn('[Notifications] skip write failed:', e?.message);
    }
    onComplete?.();
  }, [userId, saving, onComplete]);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: BG, color: '#fff' }}
    >
      <OnboardingBackButton onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top,16px)+72px)] pb-6">
        <h1 className="text-[22px] font-black tracking-tight uppercase mb-1">
          How should we reach you?
        </h1>
        <p className="text-xs text-white/40 uppercase tracking-[0.18em] mb-8 font-mono">
          Pick one. Change it anytime in Settings.
        </p>

        <div className="space-y-3">
          {/* IN-APP ONLY */}
          <Option
            label="IN-APP ONLY"
            blurb="Notifications appear in the bell. No external messages."
            selected={choice === 'none'}
            onClick={() => selectChoice('none')}
          />

          {/* WHATSAPP */}
          <Option
            label="WHATSAPP"
            blurb="Safety alerts + key updates sent to your number."
            selected={choice === 'whatsapp'}
            onClick={() => selectChoice('whatsapp')}
          >
            {choice === 'whatsapp' && (
              <div className="mt-3">
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 7700 900123"
                  className="w-full px-3 py-2.5 rounded-md bg-black/60 border text-sm text-white placeholder:text-white/30 outline-none font-mono"
                  style={{
                    borderColor: phoneValid ? 'rgba(255,255,255,0.12)' : '#ef4444',
                  }}
                />
                {!phoneValid && (
                  <p className="text-[11px] text-red-400 mt-1.5 font-mono">
                    Use full E.164 — e.g. +447700900123
                  </p>
                )}
              </div>
            )}
          </Option>

          {/* TELEGRAM */}
          <Option
            label="TELEGRAM"
            blurb="Connect @HOTMESSBot to receive updates."
            selected={choice === 'telegram'}
            onClick={() => selectChoice('telegram')}
          >
            {choice === 'telegram' && (
              <button
                type="button"
                onClick={handleOpenTelegram}
                disabled={!telegramToken}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-[0.15em] transition-colors"
                style={{
                  background: GOLD,
                  color: BG,
                  opacity: telegramToken ? 1 : 0.5,
                }}
              >
                Open Telegram →
              </button>
            )}
          </Option>
        </div>

        <p className="text-[11px] text-white/30 mt-6 leading-relaxed">
          Browser notifications are offered separately in Settings.
        </p>

        {error && (
          <p className="text-xs text-red-400 mt-4 font-mono">{error}</p>
        )}
      </div>

      {/* Footer actions */}
      <div
        className="px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] flex gap-3 border-t border-white/[0.06]"
        style={{ background: BG }}
      >
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="flex-1 py-3 rounded-md text-xs font-mono uppercase tracking-[0.18em] text-white/50 hover:text-white border border-white/10 transition-colors disabled:opacity-40"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving || !choice || (choice === 'whatsapp' && !phoneValid)}
          className="flex-[2] py-3 rounded-md text-xs font-mono uppercase tracking-[0.18em] font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: GOLD, color: BG }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Continue
        </button>
      </div>
    </div>
  );
}

function Option({ label, blurb, selected, onClick, children }) {
  return (
    <div
      className="rounded-lg p-4 cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(200,150,44,0.08)' : 'rgba(255,255,255,0.02)',
        boxShadow: selected ? `inset 0 0 0 1.5px ${GOLD}` : 'none',
      }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1 w-4 h-4 rounded-full flex-shrink-0 transition-colors"
          style={{
            border: `1.5px solid ${selected ? GOLD : 'rgba(255,255,255,0.25)'}`,
            background: selected ? GOLD : 'transparent',
            boxShadow: selected ? `0 0 0 3px ${BG}, 0 0 0 4.5px ${GOLD}` : 'none',
          }}
        />
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] font-mono uppercase tracking-[0.16em] font-bold"
            style={{ color: selected ? GOLD : '#fff' }}
          >
            {label}
          </div>
          <p className="text-[12px] text-white/55 mt-0.5 leading-snug">
            {blurb}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
