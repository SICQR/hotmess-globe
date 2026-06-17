/**
 * GlobePreviewScreen — Product reveal before location ask.
 *
 * Task #13: Globe-first onboarding — show product before location ask.
 *
 * Inserted between SIGNUP and QUICK_SETUP. User sees what they're
 * enabling (Pulse — the live London globe) before we ask for location.
 * Drop-off on the location consent toggle should fall significantly.
 *
 * Does NOT ask for location here — that stays in QuickSetupScreen
 * alongside name/photo so it's in context. This screen sells the value
 * of sharing location before the ask lands.
 */
import React, { useEffect, useState } from 'react';
import AmbientGlobe from '@/components/globe/AmbientGlobe';
import { HotmessWordmark } from '@/components/brand/HotmessWordmark';
import { MapPin, Radio, Zap } from 'lucide-react';
import { trackOnce } from '@/lib/analytics';

const GOLD = '#C8962C';

const SIGNALS = [
  {
    icon: MapPin,
    label: 'Who\'s out near you',
    sub: 'Real people. Right now. No bots.',
  },
  {
    icon: Radio,
    label: 'Live scene energy',
    sub: 'Beacons drop when something\'s happening.',
  },
  {
    icon: Zap,
    label: 'Instant connection',
    sub: 'Tap anyone on the globe. Open a chat.',
  },
];

export default function GlobePreviewScreen({ onContinue }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    trackOnce('globe_preview_seen_session', 'globe_preview_seen', 'onboarding');
    // Stagger content in after canvas has a moment to breathe
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-end justify-between overflow-hidden"
      style={{ background: '#050507' }}
    >
      {/* Ambient globe — full bleed background */}
      <AmbientGlobe />

      {/* Top wordmark — anchored, minimal */}
      <div
        className="relative z-10 w-full flex justify-center pt-16"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        <HotmessWordmark
          size="sm"
          color="#FFFFFF"
          accentColor={GOLD}
        />
      </div>

      {/* Bottom content panel */}
      <div
        className="relative z-10 w-full px-6 pb-12"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease 0.15s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s',
        }}
      >
        {/* Hero copy */}
        <div className="mb-8">
          <p
            className="text-[10px] font-black uppercase tracking-[0.45em] mb-3"
            style={{ color: GOLD }}
          >
            Pulse
          </p>
          <h1 className="text-white font-black text-3xl leading-[1.1] tracking-tight">
            London,<br />live.
          </h1>
          <p className="text-white/45 text-sm mt-3 leading-snug max-w-[280px]">
            A real-time map of queer London. The globe shows everyone out
            right now — and they can see you too.
          </p>
        </div>

        {/* Signal list */}
        <div className="flex flex-col gap-4 mb-8">
          {SIGNALS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}
              >
                <Icon className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{label}</p>
                <p className="text-white/35 text-xs mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase text-black transition-opacity active:opacity-80"
          style={{ backgroundColor: GOLD }}
        >
          Set up my profile
        </button>

        <p className="text-white/20 text-[11px] text-center mt-4 leading-relaxed">
          You choose what to share on the next screen.
        </p>
      </div>
    </div>
  );
}
