/**
 * TelegramLoginButton — wraps the official Telegram Login Widget
 * (https://core.telegram.org/widgets/login) for the HOTMESS auth screen.
 *
 * Two render modes:
 *   1. Embedded widget (preferred on web). Telegram's iframe-based widget
 *      is appended into a container ref. Tapping it opens Telegram on
 *      mobile / a Telegram OAuth dialog on desktop.
 *   2. Fallback button (when the widget script is blocked or VITE_TELEGRAM_BOT_USERNAME
 *      is missing). Opens https://t.me/{bot}?start=auth manually.
 *
 * On successful auth, Telegram calls our global onTelegramAuth(user) hook,
 * which POSTs the auth payload to /api/auth/telegram-callback and redirects
 * to the returned Supabase action_link.
 *
 * Env required (frontend):
 *   VITE_TELEGRAM_BOT_USERNAME   (e.g. 'HotmessAuthBot')
 *
 * Env required (server, see api/auth/telegram-callback.js):
 *   TELEGRAM_BOT_TOKEN
 *
 * Privacy: Telegram passes id/first_name/last_name/username/photo_url. We
 * label this option 'private' in the UI because Telegram never reveals the
 * user's phone or email to us — only the public profile fields.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { track } from '@/lib/analytics';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';
const WIDGET_SCRIPT = `https://telegram.org/js/telegram-widget.js?22`;
const CALLBACK_GLOBAL = '__hmTelegramAuth';

export default function TelegramLoginButton({ disabled }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!BOT_USERNAME) {
      setError('MISSING_TELEGRAM_BOT_USERNAME');
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    // Set up the global callback Telegram's widget script will call
    window[CALLBACK_GLOBAL] = async (user) => {
      setError('');
      setVerifying(true);
      try {
        const r = await fetch('/api/auth/telegram-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const data = await r.json();
        if (!r.ok) {
          setError(humanError(data?.error));
          setVerifying(false);
          return;
        }
        track('signup', 'onboarding', 'telegram');
        if (data?.action_link) {
          window.location.assign(data.action_link);
        } else {
          setError('Sign-in succeeded but no session link. Reload the page.');
          setVerifying(false);
        }
      } catch (err) {
        setError(err?.message || 'Network error.');
        setVerifying(false);
      }
    };

    // Mount the widget script (idempotent — guard against re-render)
    const existing = container.querySelector('script[data-hm-tg-widget]');
    if (!existing) {
      const s = document.createElement('script');
      s.async = true;
      s.src = WIDGET_SCRIPT;
      s.setAttribute('data-hm-tg-widget', 'true');
      s.setAttribute('data-telegram-login', BOT_USERNAME);
      s.setAttribute('data-size', 'large');
      s.setAttribute('data-userpic', 'false');
      s.setAttribute('data-radius', '12');
      s.setAttribute('data-onauth', `${CALLBACK_GLOBAL}(user)`);
      s.setAttribute('data-request-access', 'write');
      container.appendChild(s);
    }

    return () => {
      try { delete window[CALLBACK_GLOBAL]; } catch { window[CALLBACK_GLOBAL] = undefined; }
    };
  }, []);

  if (error === 'MISSING_TELEGRAM_BOT_USERNAME') {
    // Don't render — env not configured. PR body documents the required env.
    return null;
  }

  return (
    <div className="w-full">
      <div className="relative">
        <div
          ref={containerRef}
          className={`w-full ${disabled || verifying ? 'pointer-events-none opacity-40' : ''}`}
          aria-label="Continue with Telegram"
        />
        {/* "private" badge sits just above the widget */}
        <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-[#0A0A0A] text-[8px] font-black uppercase tracking-widest text-white/40 border border-white/10">
          private
        </span>
        {verifying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          </div>
        )}
      </div>
      {error && error !== 'MISSING_TELEGRAM_BOT_USERNAME' && (
        <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  );
}

function humanError(code) {
  switch (code) {
    case 'MISSING_TELEGRAM_BOT_TOKEN':
      return "Telegram sign-in isn't set up yet. Try Apple, Google, or phone.";
    case 'SUPABASE_ADMIN_NOT_CONFIGURED':
      return "Server isn't configured to sign you in by Telegram yet.";
    case 'invalid_hash':
      return "Telegram couldn't verify the sign-in. Try again.";
    case 'expired':
      return 'Sign-in token expired. Tap the button again.';
    case 'missing_fields':
      return 'Telegram returned an incomplete payload.';
    default:
      return code || 'Telegram sign-in failed. Try again.';
  }
}
