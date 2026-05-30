/**
 * MovementMessageCard — Rich message card for movement context in chat
 *
 * Rendered when a message has metadata.type === 'movement'.
 * Shows destination, ETA, passing-near status, and action CTAs.
 *
 * ┌──────────────────────────────────────┐
 * │  → On the way                        │
 * │  Heading to Soho · ETA 6 min         │
 * │  ✨ Passing near you                 │
 * │                                      │
 * │  [Share ETA]  [Meet halfway]         │
 * └──────────────────────────────────────┘
 */

import { motion } from 'framer-motion';
import { Navigation, Clock, MapPin, Send } from 'lucide-react';

const AMBER = '#C8962C';

export interface MovementMessageData {
  type: 'movement';
  destination?: string;
  etaMinutes?: number;
  isPassingNear?: boolean;
  originArea?: string;
  sessionId?: string;
}

interface Props {
  metadata: MovementMessageData;
  isMe: boolean;
  onShareETA?: () => void;
  onMeetHalfway?: () => void;
}

export function MovementMessageCard({ metadata, isMe, onShareETA, onMeetHalfway }: Props) {
  const { destination, etaMinutes, isPassingNear, originArea } = metadata;

  return (
    <div
      className="rounded-2xl overflow-hidden max-w-[280px]"
      style={{
        background: isMe ? 'rgba(200,150,44,0.15)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isMe ? 'rgba(200,150,44,0.3)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-2 flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(200,150,44,0.2)' }}
        >
          <Navigation className="w-3.5 h-3.5" style={{ color: AMBER }} />
        </div>
        <span className="text-sm font-bold text-white">On the way</span>
      </div>

      {/* Details */}
      <div className="px-3.5 pb-2 flex flex-col gap-1">
        {destination && (
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>Heading to {destination}</span>
          </div>
        )}
        {etaMinutes != null && (
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>ETA {etaMinutes} min</span>
          </div>
        )}
        {isPassingNear && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-xs font-semibold mt-0.5"
            style={{ color: AMBER }}
          >
            <span>Passing near you</span>
          </motion.div>
        )}
      </div>

      {/* Action CTAs (only for received messages) */}
      {!isMe && (onShareETA || onMeetHalfway) && (
        <div className="flex gap-2 px-3.5 pb-3 pt-1">
          {onShareETA && (
            <motion.button
              onClick={onShareETA}
              whileTap={{ scale: 0.95 }}
              className="flex-1 h-8 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 bg-white/5 text-white/60 active:bg-white/10 transition-colors"
              aria-label="Share your ETA"
            >
              <Send className="w-3 h-3" />
              Share ETA
            </motion.button>
          )}
          {onMeetHalfway && (
            <motion.button
              onClick={onMeetHalfway}
              whileTap={{ scale: 0.95 }}
              className="flex-1 h-8 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1"
              style={{ backgroundColor: 'rgba(200,150,44,0.15)', color: AMBER }}
              aria-label="Meet halfway"
            >
              <MapPin className="w-3 h-3" />
              Meet halfway
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

export default MovementMessageCard;
