/**
 * AgeGateScreen — Styled popup age gate. HOTMESS tone.
 * One checkbox. One button. No DOB — handled in profile/verification.
 */
import React, { useState } from 'react';
import BlockedScreen from './BlockedScreen';
import { track } from '@/lib/analytics';

const GOLD = '#C8962C';

function ProgressDots({ current, total }) {
  return (
    <div className="flex gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="text-xs" style={{ color: i < current ? GOLD : '#333' }}>
          {i < current ? '●' : '○'}
        </span>
      ))}
    </div>
  );
}

export { ProgressDots };

export default function AgeGateScreen({ onComplete }) {
  const [confirmed, setConfirmed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  if (blocked) return <BlockedScreen reason="age" />;

  const handleContinue = () => {
    if (!confirmed) return;
    try { localStorage.setItem('hm_age_gate_passed', 'true'); } catch {}
    // Chunk 17c: instrument age gate pass
    track('age_gate_passed', 'onboarding');
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Card */}
      <div
        className="w-full max-w-xs rounded-2xl px-7 py-9 relative overflow-hidden"
        style={{
          background: '#0D0D0D',
          border: `1px solid rgba(200,150,44,0.25)`,
          boxShadow: '0 0 60px rgba(200,150,44,0.08)',
        }}
      >
        {/* Top gold rule */}
        <div
          className="absolute top-0 left-8 right-8 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
        />

        {/* Wordmark */}
        <p className="text-center font-black italic tracking-tight text-white text-lg mb-1 select-none">
          HOT<span style={{ color: GOLD }}>MESS</span>
        </p>

        {/* Tone line */}
        <p
          className="text-center text-xs uppercase tracking-[0.3em] mb-8"
          style={{ color: `${GOLD}99` }}
        >
          Built for boys like you
        </p>

        {/* Door copy */}
        <p className="text-white text-base font-bold mb-1 leading-snug">
          Daddy's home.
        </p>
        <p className="text-white/40 text-sm mb-8 leading-relaxed">
          Come on in. This is a space for gay and bisexual men aged 18 and over.
        </p>

        {/* Checkbox */}
        <label className="flex items-start gap-4 mb-8 cursor-pointer group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200"
              style={{
                borderColor: confirmed ? GOLD : '#444',
                backgroundColor: confirmed ? GOLD : 'transparent',
              }}
            >
              {confirmed && (
                <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <span
            className="text-sm leading-snug transition-colors duration-200"
            style={{ color: confirmed ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}
          >
            I confirm I am a man aged 18 or over
          </span>
        </label>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={!confirmed}
          className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all duration-200"
          style={{
            backgroundColor: confirmed ? GOLD : '#1a1a1a',
            color: confirmed ? '#000' : '#444',
            border: confirmed ? 'none' : '1px solid #2a2a2a',
          }}
        >
          {confirmed ? 'Enter the Mess' : 'Confirm to enter'}
        </button>

        {/* Under 18 escape */}
        <p
          className="text-center text-xs mt-5 cursor-pointer transition-colors hover:text-white/30"
          style={{ color: 'rgba(255,255,255,0.12)' }}
          onClick={() => setBlocked(true)}
        >
          I am under 18
        </p>

        {/* Bottom gold rule */}
        <div
          className="absolute bottom-0 left-8 right-8 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}40, transparent)` }}
        />
      </div>
    </div>
  );
}
