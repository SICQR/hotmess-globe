import { motion, useScroll, useSpring } from 'framer-motion';
import { motionEnabled } from '@/lib/animations';

/**
 * ScrollProgress - Gradient progress bar at top of page
 * LED Brutalist styling: Hot pink → Cyan gradient, sharp edges, thin line
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (!motionEnabled) {
    return null;
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF1493] via-[#00D9FF] to-[#FF1493] origin-left z-50"
      style={{ scaleX }}
    />
  );
}
