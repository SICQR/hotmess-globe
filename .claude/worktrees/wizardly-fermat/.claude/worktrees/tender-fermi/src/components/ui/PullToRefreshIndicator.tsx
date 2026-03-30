/**
 * PullToRefreshIndicator — Visual spinner for pull-to-refresh
 *
 * Shows a rotating loader that scales with pull distance.
 * Place above the scrollable content area.
 */

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface Props {
  pullDistance: number;
  isRefreshing: boolean;
}

const THRESHOLD = 80;

export function PullToRefreshIndicator({ pullDistance, isRefreshing }: Props) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 360;

  return (
    <motion.div
      className="flex items-center justify-center overflow-hidden"
      style={{ height: pullDistance }}
      animate={{ height: isRefreshing ? 48 : pullDistance }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <motion.div
        animate={isRefreshing ? { rotate: 360 } : { rotate: rotation }}
        transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
      >
        <Loader2
          className="w-5 h-5"
          style={{
            color: '#C8962C',
            opacity: Math.max(0.3, progress),
          }}
        />
      </motion.div>
    </motion.div>
  );
}
