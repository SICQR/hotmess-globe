/**
 * SplashScreen — First screen for unauthenticated users.
 * Full-bleed black. HOTMESS wordmark. Join / Sign In.
 */
import React from 'react';

const GOLD = '#C8962C';

export default function SplashScreen({ onJoin, onSignIn }) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      {/* Wordmark */}
      <h1
        className="text-4xl font-black italic tracking-tight mb-16 select-none"
        style={{ color: GOLD }}
      >
        HOTMESS
      </h1>

      {/* CTAs */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={onJoin}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide"
          style={{ backgroundColor: GOLD }}
        >
          Join
        </button>
        <button
          onClick={onSignIn}
          className="w-full py-4 rounded-lg text-sm font-medium tracking-wide"
          style={{ color: GOLD, background: 'transparent' }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
