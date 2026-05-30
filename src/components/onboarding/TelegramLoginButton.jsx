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

const BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
const WIDGET_SCRIPT = `https://telegram.org/js/telegram-widget.js?22`;
const CALLBACK_GLOBAL = '__hmTelegramAuth';
// If the Telegram iframe hasn't injected itself within this window, render a
// deep-link fallback so users on broken-widget deployments (BotFather domain
// not whitelisted, CSP edge cases, script blocked) still have a path through.
const WIDGET_FALLBACK_MS = 3000;

export default function TelegramLoginButton({ disabled }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  // showFallback flips true if the widget doesn't render an <iframe> within
  // WIDGET_FALLBACK_MS. Once true it sticks — we don't bounce the user back
  // to a broken widget if it loads late.
  const [showFallback, setShowFallback] = useState(false);

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

    // Watchdog: if no iframe is rendered after WIDGET_FALLBACK_MS, expose the
    // "Open Telegram" deep-link button so the user isn't stuck on a blank
    // square. Telegram's widget always renders an <iframe> on success; absence
    // is a reliable signal something blocked it (domain whitelist, CSP, etc.).
    //
    // Auth funnel rescue (2026-05-17): pair the watchdog with a MutationObserver
    // so the fallback DISMISSES if the iframe shows up later (slow networks,
    // late script load). Prevents the duplicate-button experience Glen reported
    // where both "Log in with Telegram" iframe + "Open Telegram" fallback were
    // visible at once.
    const watchdog = setTimeout(() => {
      if (!container.querySelector('iframe')) {
        setShowFallback(true);
      }
    }, WIDGET_FALLBACK_MS);

    const observer = new MutationObserver(() => {
      if (container.querySelector('iframe')) {
        setShowFallback(false);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      clearTimeout(watchdog);
      observer.disconnect();
      try { delete window[CALLBACK_GLOBAL]; } catch { window[CALLBACK_GLOBAL] = undefined; }
    };
  }, []);

  if (error === 'MISSING_TELEGRAM_BOT_USERNAME') {
    // Don't render — env not configured. PR body documents the required env.
    return null;
  }

  // Responsive container: `max-w-xs mx-auto` keeps the widget from overflowing
  // narrow mobile viewports while still spanning full width on tall sheets.
  return (
    <div className="w-full max-w-xs mx-auto">
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
      {showFallback && (
        // Graceful degradation: deep-link to the bot's start command so the
        // user can complete linking outside the embedded widget if it's broken.
        // ?start=auth gives the bot a server-side signal that this is a login
        // flow (handled in api/auth/telegram-callback.js based on chat context).
        <a
          href={`https://t.me/${BOT_USERNAME}?start=auth`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088cc] px-4 py-3 text-sm font-medium text-white hover:bg-[#0077b5] focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:ring-offset-2 focus:ring-offset-black"
        >
          Open Telegram
        </a>
      )}
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
