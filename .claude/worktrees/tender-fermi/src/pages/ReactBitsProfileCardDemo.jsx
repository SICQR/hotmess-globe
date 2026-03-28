import React, { useMemo, useState } from 'react';
import ProfileCard from '@/components/react-bits/ProfileCard/ProfileCard';

const svgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const makeInitialsAvatar = ({ initials = 'HM', bg1 = '#0ea5e9', bg2 = '#a855f7' } = {}) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg1}"/>
          <stop offset="100%" stop-color="${bg2}"/>
        </linearGradient>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.15"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="800" height="1100" fill="url(#g)"/>
      <rect width="800" height="1100" filter="url(#noise)" opacity="0.35"/>
      <circle cx="400" cy="390" r="250" fill="rgba(0,0,0,0.18)"/>
      <text x="400" y="450" text-anchor="middle" font-size="180" fill="rgba(255,255,255,0.92)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">
        ${String(initials).slice(0, 3)}
      </text>
      <text x="400" y="980" text-anchor="middle" font-size="34" fill="rgba(255,255,255,0.75)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">
        HOTMESS • react-bits card demo
      </text>
    </svg>
  `.trim();
  return svgDataUrl(svg);
};

const makeIconMask = () => {
  // Simple repeating dot pattern works nicely as a mask.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="white"/>
        </pattern>
      </defs>
      <rect width="120" height="120" fill="url(#p)"/>
    </svg>
  `.trim();
  return svgDataUrl(svg);
};

const makeGrain = () => {
  // Tiny noisy tile.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="220" height="220" filter="url(#n)" opacity="0.6"/>
    </svg>
  `.trim();
  return svgDataUrl(svg);
};

export default function ReactBitsProfileCardDemo() {
  const [tilt, setTilt] = useState(true);
  const [glow, setGlow] = useState(true);

  const avatarUrl = useMemo(
    () => makeInitialsAvatar({ initials: 'PG', bg1: '#0f172a', bg2: '#ef4444' }),
    []
  );

  const miniAvatarUrl = useMemo(
    () => makeInitialsAvatar({ initials: 'PG', bg1: '#111827', bg2: '#22c55e' }),
    []
  );

  const iconUrl = useMemo(() => makeIconMask(), []);
  const grainUrl = useMemo(() => makeGrain(), []);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">react-bits ProfileCard (demo)</h1>
            <p className="text-sm text-zinc-400">Holographic tilt card, as added to the repo.</p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-white"
                checked={tilt}
                onChange={(e) => setTilt(e.target.checked)}
              />
              Tilt
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-white"
                checked={glow}
                onChange={(e) => setGlow(e.target.checked)}
              />
              Glow
            </label>
          </div>
        </div>

        <div className="mt-8 flex w-full items-center justify-center">
          <ProfileCard
            avatarUrl={avatarUrl}
            miniAvatarUrl={miniAvatarUrl}
            iconUrl={iconUrl}
            grainUrl={grainUrl}
            enableTilt={tilt}
            behindGlowEnabled={glow}
            behindGlowColor="rgba(244, 63, 94, 0.6)"
            behindGlowSize="55%"
            name="Philip"
            title="HOTMESS — demo profile"
            handle="hotmess"
            status={tilt ? 'Tilting' : 'Static'}
            contactText="Message"
            onContactClick={() => {
              alert('Contact clicked');
            }}
          />
        </div>
      </div>
    </div>
  );
}
