/**
 * BridgeScreen — Phase 1 conversion repair (Phil 2026-05-28).
 *
 * Slots between AgeGateScreen and SignUpScreen. The old flow went straight
 * from the warm age-gate ("Daddy's home. Come on in.") to a chrome-blank
 * SaaS auth form. That tonal cliff was probably the worst contributor to
 * the 18/7d signup-screen abandons.
 *
 * This screen is the explanation layer the user has been waiting for since
 * splash: what's inside, what each surface does, what it asks of them.
 * Three icons + three lines + one CTA. No data collection.
 *
 * Doctrine: explanation before commitment. Threshold reduction.
 */

import React, { useEffect, useState } from 'react';
import { MapPin, Users, HandHeart } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';
import { track } from '@/lib/analytics';

const GOLD = '#C8962C';

export default function BridgeScreen({ onContinue, onBack }) {
  const [fadeIn, setFadeIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 50);
    track('onboarding_stage_completed', 'onboarding', 'bridge_shown');
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: '#0A0A0A' }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 text-[12px] uppercase tracking-wider text-white/40 hover:text-white/60"
        >
          ← Back
        </button>
      )}

      <div
        className="w-full max-w-xs"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <ProgressDots current={1} total={3} />

        <h2 className="text-white text-2xl font-black mb-2 tracking-tight">
          You're in. Here's the room.
        </h2>
        <p className="text-white/45 text-[13px] mb-8 leading-relaxed">
          Three surfaces. You choose how much of you each one sees.
        </p>

        <div className="flex flex-col gap-5 mb-10">
          <Row
            icon={<MapPin className="w-5 h-5" style={{ color: GOLD }} />}
            title="Pulse"
            body="Live globe of venues + boys nearby. Your location is fuzzed — never exact."
          />
          <Row
            icon={<Users className="w-5 h-5" style={{ color: GOLD }} />}
            title="Ghosted"
            body="Grid of who's around. Tap to boo. They can't message you until you boo back."
          />
          <Row
            icon={<HandHeart className="w-5 h-5" style={{ color: GOLD }} />}
            title="Care"
            body="SOS, aftercare, recovery resources. Always free. No tier required."
          />
        </div>

        <button
          onClick={() => {
            track('onboarding_stage_completed', 'onboarding', 'bridge_continue');
            onContinue();
          }}
          className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase"
          style={{ backgroundColor: GOLD, color: '#000' }}
        >
          Set me up
        </button>

        <p className="text-white/25 text-[11px] mt-5 text-center leading-relaxed">
          Free to join. Beta access for the first 250. No card required.
        </p>
      </div>
    </div>
  );
}

function Row({ icon, title, body }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-white text-[14px] font-bold leading-tight mb-1">{title}</p>
        <p className="text-white/50 text-[12px] leading-snug">{body}</p>
      </div>
    </div>
  );
}
