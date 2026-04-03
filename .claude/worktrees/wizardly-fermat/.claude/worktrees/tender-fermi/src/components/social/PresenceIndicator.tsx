/**
 * PresenceIndicator — Online status dot with pulse animation
 *
 * Adapted from SICQR/ghosted with HOTMESS styling:
 * - Gold (#C8962C) accent color instead of generic accent
 * - Matches HOTMESS design system
 */

import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface PresenceIndicatorProps {
  isOnline: boolean;
  lastSeen?: Date | string | null;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const GOLD = '#C8962C';

export function PresenceIndicator({
  isOnline,
  lastSeen,
  size = 'md',
  showText = false,
  className = '',
}: PresenceIndicatorProps) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const getPresenceText = () => {
    if (isOnline) {
      return 'Active now';
    }
    if (lastSeen) {
      const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
      return `Active ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`;
    }
    return 'Offline';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isOnline ? (
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <div
            className={`${sizes[size]} rounded-full border-2 border-black shadow-lg`}
            style={{ backgroundColor: GOLD }}
          />
          <motion.div
            className={`absolute inset-0 rounded-full`}
            style={{ backgroundColor: GOLD }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.8, 0, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      ) : (
        <div className={`${sizes[size]} bg-white/20 rounded-full border-2 border-black`} />
      )}
      {showText && (
        <span
          className={`text-sm ${isOnline ? 'text-amber-500' : 'text-white/40'}`}
        >
          {getPresenceText()}
        </span>
      )}
    </div>
  );
}

export default PresenceIndicator;
