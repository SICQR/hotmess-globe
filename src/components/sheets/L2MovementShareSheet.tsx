/**
 * L2MovementShareSheet — Start sharing your movement
 *
 * ┌──────────────────────────────────────┐
 * │  ← Back     Share Movement           │
 * ├──────────────────────────────────────┤
 * │                                      │
 * │  Where are you heading?              │
 * │  [___________________________]       │
 * │                                      │
 * │  Share for                           │
 * │  [15 min] [30 min] [60 min] [Arrive] │
 * │                                      │
 * │  Who can see                         │
 * │  [Chats] [Live mode] [Public]        │
 * │                                      │
 * │  ⓘ Approximate only. Stop anytime.  │
 * │                                      │
 * ├──────────────────────────────────────┤
 * │  [Start Sharing]                     │
 * └──────────────────────────────────────┘
 *
 * Props: none (or optional prefilled destination)
 * States: idle | submitting
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Navigation, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';
import { useMovementSession, type MovementVisibility, type ShareUntil } from '@/hooks/useMovementSession';

// ── Constants ────────────────────────────────────────────────────────────────

const AMBER = '#C8962C';

const DURATION_OPTIONS: { key: ShareUntil; label: string }[] = [
  { key: '15_min', label: '15 min' },
  { key: '30_min', label: '30 min' },
  { key: '60_min', label: '60 min' },
  { key: 'arrival', label: 'Until arrival' },
];

const VISIBILITY_OPTIONS: { key: MovementVisibility; label: string; desc: string }[] = [
  { key: 'chats_only', label: 'Chats only', desc: 'Only people you chat with' },
  { key: 'live_mode', label: 'Live mode', desc: 'Visible on Ghosted Live tab' },
  { key: 'public_live', label: 'Public', desc: 'Visible on Pulse + Ghosted' },
];

// ── Selector chip ────────────────────────────────────────────────────────────

function SelectorChip({
  label,
  isActive,
  onTap,
}: {
  label: string;
  isActive: boolean;
  onTap: () => void;
}) {
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.95 }}
      className={`h-10 px-4 rounded-full text-sm font-semibold transition-colors ${
        isActive
          ? 'text-black'
          : 'text-white/50 border border-white/10'
      }`}
      style={isActive ? { backgroundColor: AMBER } : { backgroundColor: 'rgba(255,255,255,0.03)' }}
      aria-pressed={isActive}
    >
      {label}
    </motion.button>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function L2MovementShareSheet({
  prefillDestination,
}: {
  prefillDestination?: string;
}) {
  const { closeSheet } = useSheet();
  const { startMovement } = useMovementSession();

  const [destination, setDestination] = useState(prefillDestination || '');
  const [shareUntil, setShareUntil] = useState<ShareUntil>('30_min');
  const [visibility, setVisibility] = useState<MovementVisibility>('live_mode');
  const [submitting, setSubmitting] = useState(false);

  const handleStart = useCallback(async () => {
    setSubmitting(true);
    try {
      await startMovement({
        destinationLabel: destination.trim() || undefined,
        visibility,
        shareUntil,
      });
      toast('Movement sharing started');
      closeSheet();
    } catch (err) {
      toast('Failed to start sharing');
    } finally {
      setSubmitting(false);
    }
  }, [destination, visibility, shareUntil, startMovement, closeSheet]);

  return (
    <div className="h-full flex flex-col" style={{ background: '#0D0D0D' }}>
      {/* Header */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-white/5 flex-shrink-0">
        <button
          onClick={closeSheet}
          className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-transform"
          aria-label="Close"
        >
          <ChevronLeft className="w-5 h-5 text-white/60" />
        </button>
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" style={{ color: AMBER }} />
          <h1 className="text-lg font-bold text-white">Share Movement</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-safe">
        {/* Destination input */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-white/70 mb-2 block">
            Where are you heading?
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Soho, The Eagle, home..."
            className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder:text-white/20 focus:outline-none focus:border-[#C8962C]/50 focus:ring-1 focus:ring-[#C8962C]/30 transition-colors"
            style={{ fontSize: '16px' }}
          />
          <p className="text-xs text-white/30 mt-1.5">Optional. Others see the area name, not your exact route.</p>
        </div>

        {/* Duration selector */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-white/70 mb-3 block">Share for</label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <SelectorChip
                key={opt.key}
                label={opt.label}
                isActive={shareUntil === opt.key}
                onTap={() => setShareUntil(opt.key)}
              />
            ))}
          </div>
        </div>

        {/* Visibility selector */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-white/70 mb-3 block">Who can see</label>
          <div className="flex flex-col gap-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <motion.button
                key={opt.key}
                onClick={() => setVisibility(opt.key)}
                whileTap={{ scale: 0.98 }}
                className={`w-full px-4 py-3 rounded-xl text-left transition-colors ${
                  visibility === opt.key
                    ? 'border-2'
                    : 'border border-white/10 bg-white/[0.02]'
                }`}
                style={
                  visibility === opt.key
                    ? { borderColor: AMBER, backgroundColor: 'rgba(200,150,44,0.08)' }
                    : undefined
                }
                aria-pressed={visibility === opt.key}
              >
                <span
                  className="text-sm font-semibold block"
                  style={{ color: visibility === opt.key ? AMBER : '#fff' }}
                >
                  {opt.label}
                </span>
                <span className="text-xs text-white/40">{opt.desc}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Privacy disclosure */}
        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/5">
          <Info className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/40 leading-relaxed">
            Your approximate location is shared (~100m precision). You can stop sharing anytime.
            Movement data is automatically deleted after your session ends.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 py-3 border-t border-white/5 pb-safe flex-shrink-0">
        <motion.button
          onClick={handleStart}
          disabled={submitting}
          whileTap={{ scale: 0.97 }}
          className="w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: submitting ? 'rgba(200,150,44,0.5)' : AMBER,
            color: submitting ? 'rgba(0,0,0,0.5)' : '#000',
          }}
          aria-label="Start sharing movement"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              Start Sharing
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
