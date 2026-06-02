/**
 * IOSInstallPrompt — soft bottom-anchored prompt for iOS regular Safari users.
 *
 * Phil 2026-06-02 — the only path to iPhone OS-level web push (lock-screen banners,
 * notification center entries) is an installed home-screen PWA. Apple does not
 * expose Notification or PushManager APIs to non-standalone Safari. Confirmed
 * via debug-push.html diagnostic — Phil's iPhone returned PushManager:false,
 * Notification:MISSING in regular Safari.
 *
 * This component:
 * - Detects iOS regular Safari (not standalone, has touch, no Push APIs)
 * - Shows once per session, dismissable, re-prompts after 7 days
 * - Walks Share → Add to Home Screen flow in plain text
 * - Never shown on Android, desktop, or when already installed
 * - Never auto-prompts a permission dialog (Apple wouldn't allow it anyway)
 *
 * Doctrine compliance:
 * - D17 Surface Layer: bottom-anchored, dismissable, not blocking
 * - D35 Language OS: direct, no "users", first-person guidance
 * - Safety: never blocks SOS surface (z-index below safety FAB)
 */

import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'hm.iosInstallPrompt.dismissedAt';
const REPROMPT_DAYS = 7;
const GOLD = '#C8962C';

function shouldShow(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  if (!isIOS) return false;

  // Already installed as PWA?
  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (typeof (navigator as any).standalone !== 'undefined' && (navigator as any).standalone === true);
  if (isStandalone) return false;

  // Push APIs present means it's already running where it can subscribe — no prompt needed
  const pushAvailable = 'PushManager' in window && typeof Notification !== 'undefined';
  if (pushAvailable) return false;

  // Respect dismissal window
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt > 0) {
      const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (days < REPROMPT_DAYS) return false;
    }
  } catch {}

  return true;
}

export default function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Delay 4s so it doesn't fight with onboarding or splash
    const t = window.setTimeout(() => {
      if (shouldShow()) setVisible(true);
    }, 4000);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Install HOTMESS to your home screen"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        zIndex: 60, // below SafetyFAB (typically 80+) and SOSOverlay (99+)
        background: 'rgba(20, 20, 22, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${GOLD}`,
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        color: '#eee',
        fontFamily: '-apple-system, system-ui, sans-serif',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: GOLD,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Get HOTMESS on your home screen
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.4, color: '#ccc' }}>
            Add HOTMESS to your home screen to get messages, boos and SOS pings on your lock screen.
          </div>

          {expanded && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: '#ddd',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>1.</span> Tap the{' '}
                <span style={{ fontWeight: 700 }}>Share</span> button in Safari (square with an arrow up,
                bottom or top of screen).
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>2.</span> Scroll and tap{' '}
                <span style={{ fontWeight: 700 }}>"Add to Home Screen"</span>.
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>3.</span> Tap{' '}
                <span style={{ fontWeight: 700 }}>Add</span> in the top-right.
              </div>
              <div>
                <span style={{ color: GOLD, fontWeight: 700 }}>4.</span> Open HOTMESS from your home
                screen. Go to Settings → Push Notifications and flip the toggle.
              </div>
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 11,
                  color: '#888',
                }}
              >
                Apple only allows web push from installed PWAs. There's no way around this — but once
                installed, everything works exactly like a native app notification.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{
                background: GOLD,
                color: '#000',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {expanded ? 'Hide steps' : 'Show me how'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              style={{
                background: 'transparent',
                color: '#888',
                border: 'none',
                padding: '10px 8px',
                fontSize: 13,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              Not now
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            color: '#666',
            border: 'none',
            fontSize: 18,
            padding: 4,
            cursor: 'pointer',
            lineHeight: 1,
            touchAction: 'manipulation',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
