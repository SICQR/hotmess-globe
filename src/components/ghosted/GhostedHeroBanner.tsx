/**
 * GhostedHeroBanner — Compact brand banner below tabs, above grid
 *
 * ┌──────────────────────────────────────────────┐
 * │ GHOSTED          In your moment       [▶]    │
 * │                  right now                    │
 * └──────────────────────────────────────────────┘
 *
 * ~64px tall. Dark bg with subtle gold radial glow.
 * Play button triggers "Ghosted" track via RadioContext.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { useRadio } from '@/contexts/RadioContext';

function GhostedHeroBannerInner() {
  const radio = useRadio();

  return (
    <motion.div
      className="relative mx-3 mt-2 mb-1 rounded-2xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 70% 50%, rgba(200,150,44,0.08) 0%, rgba(5,5,7,0.95) 70%)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: branding */}
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[10px] tracking-[0.25em] uppercase font-bold text-white/30"
          >
            GHOSTED
          </span>
          <span className="text-[15px] font-semibold text-white leading-tight">
            In your moment right now
          </span>
        </div>

        {/* Right: play button */}
        <button
          onClick={radio.togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#C8962C]/15 border border-[#C8962C]/30 active:scale-95 transition-transform"
          aria-label={radio.isPlaying ? 'Pause radio' : 'Play radio'}
        >
          {radio.isPlaying ? (
            <Pause className="w-4 h-4 text-[#C8962C]" />
          ) : (
            <Play className="w-4 h-4 text-[#C8962C] ml-0.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

export const GhostedHeroBanner = memo(GhostedHeroBannerInner);
export default GhostedHeroBanner;
