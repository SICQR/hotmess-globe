/**
 * RadioStrip — compact radio player CTA for the home screen.
 *
 * Uses useRadio() context. Animated bars when playing.
 * 72px height, dark photo overlay aesthetic.
 *
 * Phil 2026-06-16: Home redesign — radio gets a persistent presence on Home.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

const GOLD = '#C8962C';

// Lightweight waveform icon (5 bars) — avoids external SVG import
function WaveformIcon({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 16 }}>
      {[4, 10, 7, 12, 5].map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: playing ? undefined : h,
            background: GOLD,
            animation: playing ? `barBounce${i} 0.8s ease-in-out infinite alternate` : undefined,
            minHeight: playing ? 3 : undefined,
            maxHeight: 14,
            alignSelf: 'flex-end',
          }}
        />
      ))}
      {playing && (
        <style>{`
          @keyframes barBounce0 { from { height: 3px } to { height: 12px } }
          @keyframes barBounce1 { from { height: 8px } to { height: 14px } }
          @keyframes barBounce2 { from { height: 5px } to { height: 10px } }
          @keyframes barBounce3 { from { height: 10px } to { height: 4px } }
          @keyframes barBounce4 { from { height: 4px } to { height: 13px } }
        `}</style>
      )}
    </div>
  );
}

// Safe hook: falls back gracefully if useRadio context doesn't exist yet
function useRadioSafe() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useRadio } = require('@/contexts/RadioContext');
    return useRadio();
  } catch {
    return { isPlaying: false, currentShowName: 'HOTMESS RADIO', togglePlay: () => {} };
  }
}

export default function RadioStrip() {
  const navigate = useNavigate();
  const { isPlaying, currentShowName, togglePlay } = useRadioSafe();

  return (
    <div
      className="mx-5 mb-4 rounded-[18px] overflow-hidden flex items-center justify-between px-5"
      style={{
        height: 72,
        background: 'linear-gradient(135deg, #0d0d0f 0%, #111114 100%)',
        border: `1px solid ${isPlaying ? 'rgba(200,150,44,0.25)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Left: toggle play */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex items-center gap-3 active:opacity-70 transition-opacity"
        aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 38,
            height: 38,
            background: isPlaying ? GOLD : 'rgba(200,150,44,0.12)',
            border: isPlaying ? 'none' : `1px solid rgba(200,150,44,0.28)`,
          }}
        >
          {isPlaying ? (
            // Pause icon
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <rect x="0" y="0" width="4" height="14" rx="1.5" fill="#050507" />
              <rect x="8" y="0" width="4" height="14" rx="1.5" fill="#050507" />
            </svg>
          ) : (
            // Play icon
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M2 1L11 7L2 13V1Z" fill={GOLD} />
            </svg>
          )}
        </div>

        <div>
          <p className="text-[13px] font-black text-white leading-tight">
            {isPlaying ? currentShowName || 'HOTMESS RADIO' : 'HOTMESS RADIO'}
          </p>
          <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {isPlaying ? 'Now playing' : 'Tap to tune in'}
          </p>
        </div>
      </button>

      {/* Right: waveform + open radio */}
      <div className="flex items-center gap-4">
        <WaveformIcon playing={isPlaying} />
        <button
          type="button"
          onClick={() => navigate('/radio')}
          className="text-[11px] font-semibold active:opacity-70 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Open
        </button>
      </div>
    </div>
  );
}
