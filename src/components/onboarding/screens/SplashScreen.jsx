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
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';

export default function SplashScreen({ onJoin, onSignIn, fastPath = false, onFastPath }) {
  const [rulesIn, setRulesIn] = useState(false);
  const [ctasIn, setCtasIn] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const lastName = (() => { try { return localStorage.getItem('hm_last_display_name'); } catch { return null; } })();

  useEffect(() => {
    // Gold rules draw in at 300ms, CTAs at 900ms
    const t1 = setTimeout(() => setRulesIn(true), 300);
    const t2 = setTimeout(() => setCtasIn(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Check for existing session on mount — show returning user fast-path
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setHasSession(true);
    });
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
        <p
          className="text-[11px] font-medium tracking-[0.15em] uppercase mt-6 text-center"
          style={{
            color: '#ffffff',
            opacity: ctasIn ? 0.45 : 0,
            transition: 'opacity 0.6s ease 0.2s',
            letterSpacing: '0.2em',
          }}
        >
          Always too much. Yet never enough.
        </p>
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
        {hasSession ? (
          <>
            <p className="text-white/50 text-xs text-center mb-2">
              Welcome back{lastName ? `, ${lastName}` : ''}
            </p>
            <button
              onClick={onSignIn}
              className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase"
              style={{ backgroundColor: GOLD, color: '#000' }}
            >
              Continue
            </button>
            <button
              onClick={onSignIn}
              className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide border"
              style={{ color: GOLD, background: 'transparent', borderColor: `${GOLD}40` }}
            >
              Not you? Sign in differently
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onJoin}
              className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase"
              style={{ backgroundColor: GOLD, color: '#000' }}
            >
              Join
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
              Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
