/**
 * SplashScreen — Dark luxury brand entry point
 *
 * Design: #0A0A0A background, animated gold rules, HotmessWordmark at display
 * size, LONDON sub-tag. Two CTAs: Join (gold) / Sign In (ghost).
 *
 * Props:
 *   onJoin     — called when user taps Join
 *   onSignIn   — called when user taps Sign In
 *   fastPath   — if true, auto-navigates after 900ms (returning user fast-path)
 *   onFastPath — called after fast-path delay
 */
import React, { useEffect, useState } from 'react';
import { HotmessWordmark } from '@/components/brand/HotmessWordmark';
import BetaBadge from '@/components/feedback/BetaBadge';

const GOLD = '#C8962C';

export default function SplashScreen({ onJoin, onSignIn, fastPath = false, onFastPath }) {
  const [rulesIn, setRulesIn] = useState(false);
  const [ctasIn, setCtasIn] = useState(false);
  // Phil 2026-05-29 HOTFIX — surface invite framing during the gate chain.
  // Code was captured into sessionStorage by main.jsx when the URL was
  // /redeem/:code. Splash now shows the invite tag so the user understands
  // their beta link landed even though they're still walking the gate chain.
  const [inviteCode, setInviteCode] = useState(null);
  useEffect(() => {
    try {
      const c = sessionStorage.getItem('hm_pending_beta_code');
      if (c) setInviteCode(c);
    } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    // Gold rules draw in at 300ms, CTAs at 900ms
    const t1 = setTimeout(() => setRulesIn(true), 300);
    const t2 = setTimeout(() => setCtasIn(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Fast-path: returning user bypass (900ms then navigate)
  useEffect(() => {
    if (!fastPath || !onFastPath) return;
    const t = setTimeout(onFastPath, 900);
    return () => clearTimeout(t);
  }, [fastPath, onFastPath]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: '#0A0A0A' }}
    >
      {/* Top gold rule */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${GOLD} 40%, #D4AF37 60%, transparent 100%)`,
          transform: rulesIn ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
          transformOrigin: 'center',
        }}
      />

      {/* Bottom gold rule */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${GOLD} 40%, #D4AF37 60%, transparent 100%)`,
          transform: rulesIn ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s',
          transformOrigin: 'center',
        }}
      />

      {/* Wordmark block */}
      <div className="flex flex-col items-center mb-20">
        <HotmessWordmark
          size="display"
          animate
          color="#FFFFFF"
          accentColor={GOLD}
          showUnderline
        />
        <p
          className="text-[10px] font-black uppercase tracking-[0.5em] mt-3"
          style={{
            color: GOLD,
            opacity: rulesIn ? 0.7 : 0,
            transition: 'opacity 0.5s ease 0.5s',
          }}
        >
          London
        </p>
        {/* M-new (#252) Phil 2026-05-28: BETA badge — manages expectations cheaply. */}
        <div
          className="mt-3"
          style={{ opacity: rulesIn ? 1 : 0, transition: 'opacity 0.5s ease 0.7s' }}
        >
          <BetaBadge size="lg" />
        </div>
        {/* Phil 2026-05-29 HOTFIX — the splash IS the redeem moment when an
            invite is pending. We render the invite hero in place of the
            default tagline so beta invitees feel recognised before walking
            the gate chain. Default tagline still renders for non-invitees. */}
        {inviteCode ? (
          // Phil 2026-05-29 locked copy — recognised entry, not a sales page.
          // Two lines of body. The CTA button does the rest ('Continue to claim').
          // Code is not shown on splash — the user already typed/clicked the link;
          // showing it again is decorative weight. Doctrine 07 felt-copy: room not pitch.
          <div
            className="flex flex-col items-center mt-6 max-w-[280px]"
            style={{
              opacity: rulesIn ? 1 : 0,
              transition: 'opacity 0.6s ease 0.7s',
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-[0.4em] text-center"
              style={{ color: GOLD }}
            >
              You've been invited
            </p>
            <p className="text-white/55 text-[12px] mt-3 text-center">
              14 days. Full access. No card.
            </p>
          </div>
        ) : (
          <p
            className="text-center text-white/55 text-[12px] font-medium mt-5 leading-snug max-w-[260px]"
            style={{
              opacity: rulesIn ? 1 : 0,
              transition: 'opacity 0.6s ease 0.7s',
            }}
          >
            Real venues. Real boys. Built for the room you're already looking for.
          </p>
        )}
      </div>

      {/* CTAs */}
      <div
        className="w-full max-w-xs flex flex-col gap-3 absolute bottom-16"
        style={{
          opacity: ctasIn ? 1 : 0,
          transform: ctasIn ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <button
          onClick={onJoin}
          className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase"
          style={{ backgroundColor: GOLD, color: '#000' }}
        >
          {inviteCode ? 'Continue to claim' : 'Join'}
        </button>
        <button
          onClick={onSignIn}
          className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide border"
          style={{
            color: GOLD,
            background: 'transparent',
            borderColor: `${GOLD}40`,
          }}
        >
          {inviteCode ? 'Already on HOTMESS · Sign in' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}
